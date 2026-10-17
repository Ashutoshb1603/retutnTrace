import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStore } from './store.mjs';
import { summarizeOrders } from './data.mjs';
import { investigate, llmConfigured } from './agent.mjs';
import { z } from 'zod';
import { ticketDraft, githubConfigured, publishGithubTicket } from './workflow.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export async function startServer({ storeFactory = createStore, production = false } = {}) {
  process.chdir(root);
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '32kb' }));
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'same-origin');
    if (
      req.method !== 'GET' &&
      req.headers.origin &&
      new URL(req.headers.origin).host !== req.headers.host
    )
      return res.status(403).json({ error: 'Cross-origin writes are not allowed.' });
    next();
  });
  let store = null,
    dbError = null,
    connecting = false,
    busy = false;
  const offlineMessage =
    'FalkorDB is unavailable. Start the ReturnTrace database in Docker Desktop, then reconnect.';
  async function ready() {
    const ok = !!store && (await store.isReady());
    if (!ok && !connecting) dbError = offlineMessage;
    return ok;
  }
  async function connect() {
    if (connecting) return;
    connecting = true;
    try {
      await store?.close().catch(() => {});
      store = null;
      store = await storeFactory();
      dbError = null;
      console.log(`Graph backend connected: ${store.kind}`);
    } catch (e) {
      dbError = offlineMessage;
      console.error('Database connection failed:', e.message);
    } finally {
      connecting = false;
    }
  }
  await connect();
  app.get('/api/health', async (req, res) =>
    res.json({
      ok: await ready(),
      backend: store?.kind || 'falkordb',
      error: dbError,
      connecting,
      agent: llmConfigured() ? 'Adaptive LLM agent' : 'Adaptive evidence-policy agent',
      llmConfigured: llmConfigured(),
      githubConfigured: githubConfigured(),
      githubRepository: githubConfigured() ? process.env.GITHUB_REPOSITORY : null,
      synthetic: true,
      version: '2.0.0',
    }),
  );
  app.post('/api/reconnect', async (req, res) => {
    if (await ready()) return res.json({ ok: true });
    await connect();
    res.status(store ? 200 : 503).json({ ok: !!store, error: dbError });
  });
  app.use('/api', async (req, res, next) =>
    (await ready()) ? next() : res.status(503).json({ error: dbError || 'Database is starting.' }),
  );
  app.get('/api/overview', async (req, res) => {
    const [orders, products, counts, actions, history] = await Promise.all([
      store.orders(),
      store.products(),
      store.counts(),
      store.actions(),
      store.investigations(),
    ]);
    res.json({
      ...summarizeOrders(orders, products),
      graph: counts,
      openActions: actions.filter((a) => !['resolved', 'dismissed'].includes(a.status)).length,
      investigations: history.length,
    });
  });
  app.get('/api/returns', async (req, res) => {
    const productId = req.query.productId;
    const rows = (await store.orders()).filter(
      (o) => o.period === 'current' && o.returned && (!productId || o.productId === productId),
    );
    res.json(rows);
  });
  app.get('/api/investigations', async (req, res) =>
    res.json(await store.investigations(req.query.productId)),
  );
  app.get('/api/actions', async (req, res) => res.json(await store.actions()));
  const input = z.object({
    productId: z.string().min(1).max(64),
    question: z.string().trim().min(5).max(1200),
  });
  app.post('/api/investigate', async (req, res, next) => {
    const parsed = input.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({
        error: 'Choose a product and enter an investigation question (5–1200 characters).',
      });
    if (busy)
      return res
        .status(409)
        .json({ error: 'An investigation is already running. Please wait for it to finish.' });
    if (!(await store.products()).some((p) => p.id === parsed.data.productId))
      return res.status(404).json({ error: 'Unknown product.' });
    if (busy)
      return res
        .status(409)
        .json({ error: 'An investigation is already running. Please wait for it to finish.' });
    busy = true;
    const streaming = req.query.stream === '1';
    if (streaming) {
      res.setHeader('Content-Type', 'application/x-ndjson');
      res.setHeader('Cache-Control', 'no-cache');
      res.flushHeaders();
    }
    try {
      const result = await investigate(store, parsed.data, (event) => {
        if (streaming && !res.destroyed) res.write(JSON.stringify(event) + '\n');
      });
      if (streaming) res.end();
      else res.json(result);
    } catch (e) {
      if (streaming) {
        res.write(
          JSON.stringify({
            type: 'error',
            message: 'Investigation failed. Check the database connection and retry.',
          }) + '\n',
        );
        res.end();
        console.error(e);
      } else next(e);
    } finally {
      busy = false;
    }
  });
  const statuses = {
    draft: ['approved', 'dismissed'],
    approved: ['resolved', 'dismissed'],
    resolved: [],
    dismissed: [],
  };
  const actionLocks = new Set();
  app.patch('/api/actions/:id', async (req, res) => {
    const parsed = z
      .object({
        status: z.enum(['approved', 'resolved', 'dismissed']),
        note: z.string().trim().max(2000).default(''),
        inspection: z
          .object({
            assessment: z.enum(['confirmed', 'refuted', 'inconclusive']),
            sampled: z.number().int().min(1).max(100000),
            failed: z.number().int().min(0).max(100000),
          })
          .optional(),
      })
      .safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({ error: 'Invalid action update or inspection sample.' });
    const { status, note, inspection } = parsed.data;
    if (
      status === 'resolved' &&
      (!inspection ||
        note.length < 8 ||
        inspection.failed > inspection.sampled ||
        (inspection.assessment === 'confirmed' && inspection.failed === 0) ||
        (inspection.assessment === 'refuted' && inspection.failed > 0))
    )
      return res.status(400).json({
        error:
          'Record a result, tested sample, units reproducing the suspected failure, and a note. Counts must agree with the result.',
      });
    if (actionLocks.has(req.params.id))
      return res.status(409).json({ error: 'This task is being updated.' });
    actionLocks.add(req.params.id);
    try {
      const old = (await store.actions()).find((a) => a.id === req.params.id);
      if (!old) return res.status(404).json({ error: 'Intervention not found.' });
      if (!statuses[old.status]?.includes(status))
        return res.status(409).json({ error: `Cannot move ${old.status} to ${status}.` });
      res.json(await store.updateAction(old.id, status, note, inspection));
    } finally {
      actionLocks.delete(req.params.id);
    }
  });
  app.get('/api/actions/:id/ticket', async (req, res) => {
    const action = (await store.actions()).find((a) => a.id === req.params.id);
    if (!action) return res.status(404).json({ error: 'Intervention not found.' });
    const ticket = ticketDraft(action);
    if (req.query.download === '1') {
      res.setHeader('Content-Disposition', `attachment; filename="${action.id}-ticket.md"`);
      return res.type('text/markdown').send(`# ${ticket.title}\n\n${ticket.body}`);
    }
    res.json({ ...ticket, repository: githubConfigured() ? process.env.GITHUB_REPOSITORY : null });
  });
  app.post('/api/actions/:id/github', async (req, res) => {
    if (req.body.confirm !== true)
      return res.status(400).json({ error: 'Review the ticket and confirm sending it.' });
    if (!githubConfigured())
      return res.status(409).json({
        error:
          'GitHub ticket publishing is not configured. The local ticket and download work without credentials.',
      });
    if (actionLocks.has(req.params.id))
      return res.status(409).json({ error: 'This task is being updated.' });
    actionLocks.add(req.params.id);
    try {
      const action = (await store.actions()).find((a) => a.id === req.params.id);
      if (!action) return res.status(404).json({ error: 'Intervention not found.' });
      if (!['approved', 'resolved'].includes(action.status))
        return res.status(409).json({ error: 'Approve the local ticket before sending it.' });
      if (action.externalTicket) return res.json(action);
      const external = await publishGithubTicket(action);
      res.json(await store.attachExternalTicket(action.id, external));
    } catch (error) {
      res.status(502).json({
        error:
          error.name === 'TimeoutError'
            ? 'GitHub timed out. A retry will check for an existing ticket first.'
            : error.message,
      });
    } finally {
      actionLocks.delete(req.params.id);
    }
  });
  app.get('/api/export/:id', async (req, res) => {
    const found = (await store.investigations()).find((i) => i.id === req.params.id);
    if (!found) return res.status(404).json({ error: 'Investigation not found.' });
    res.setHeader('Content-Disposition', `attachment; filename="${found.id}.json"`);
    res.json(found);
  });
  app.use('/api', (req, res) => res.status(404).json({ error: 'Endpoint not found.' }));
  app.use((error, req, res, next) => {
    console.error(error.message);
    res.status(error.type === 'entity.parse.failed' ? 400 : 500).json({
      error:
        error.type === 'entity.parse.failed'
          ? 'Invalid JSON.'
          : 'The request could not be completed. Check the server log.',
    });
  });
  let vite;
  if (production) {
    app.use(express.static(path.join(root, 'dist')));
    app.get('/{*path}', (req, res) => res.sendFile(path.join(root, 'dist/index.html')));
  } else {
    const { createServer } = await import('vite');
    vite = await createServer({
      configLoader: 'native',
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }
  const port = Number(process.env.PORT || 4317),
    host = process.env.HOST || '127.0.0.1';
  const server = app.listen(port, host, () =>
    console.log(`ReturnTrace ready at http://${host}:${server.address().port}`),
  );
  async function stop() {
    server.close();
    await vite?.close();
    await store?.close();
    process.exit(0);
  }
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}
