import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

test('HTTP workflow validates inputs, streams evidence, enforces task transitions, and exports records', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'returntrace-api-'));
  const child = spawn(process.execPath, ['tests/support/api-server.mjs'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: '0',
      RETURNTRACE_DATA_DIR: directory,
      LLM_API_KEY: '',
      LLM_MODEL: '',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let errors = '';
  child.stderr.on('data', (chunk) => {
    errors += chunk;
  });
  try {
    const base = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(Error('Server startup timed out: ' + errors)), 15000);
      child.stdout.on('data', (chunk) => {
        const m = String(chunk).match(/ReturnTrace ready at (http:\/\/\S+)/);
        if (m) {
          clearTimeout(timer);
          resolve(m[1]);
        }
      });
      child.once('exit', (code) => {
        clearTimeout(timer);
        reject(Error(`Server exited ${code}: ${errors}`));
      });
    });
    const call = (route, body, method = 'POST', extra = {}) =>
      fetch(base + '/api' + route, {
        method,
        headers: { 'Content-Type': 'application/json', ...extra },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    assert.equal((await (await fetch(base + '/api/health')).json()).backend, 'fixture');
    assert.equal(
      (await call('/investigate', { productId: 'SKU-AURA', question: 'x' })).status,
      400,
    );
    assert.equal(
      (
        await call('/investigate', {
          productId: 'DOES-NOT-EXIST',
          question: 'Investigate this product',
        })
      ).status,
      404,
    );
    assert.equal(
      (
        await call(
          '/investigate',
          { productId: 'SKU-AURA', question: 'Investigate this product' },
          'POST',
          { Origin: 'https://unrelated.example' },
        )
      ).status,
      403,
    );
    const response = await call('/investigate?stream=1', {
      productId: 'SKU-AURA',
      question: 'Investigate the return spike',
    });
    assert.equal(response.status, 200);
    const events = (await response.text()).trim().split('\n').map(JSON.parse);
    assert.equal(events.filter((e) => e.type === 'step').length, 7);
    const { investigation, action } = events.at(-1);
    assert.equal(investigation.conclusion.kind, 'shared_component');
    assert.equal(
      (
        await call(
          `/actions/${action.id}`,
          {
            status: 'resolved',
            note: 'A valid note',
            inspection: { assessment: 'inconclusive', sampled: 10, failed: 0 },
          },
          'PATCH',
        )
      ).status,
      409,
    );
    const approval = await call(`/actions/${action.id}`, { status: 'approved' }, 'PATCH');
    assert.equal(approval.status, 200);
    assert.ok((await approval.json()).ticket.id.startsWith('TKT-'));
    const ticket = await fetch(base + `/api/actions/${action.id}/ticket?download=1`);
    assert.match(await ticket.text(), /DSP-X17/);
    assert.equal((await call(`/actions/${action.id}/github`, { confirm: false })).status, 400);
    assert.equal(
      (await call(`/actions/${action.id}`, { status: 'resolved', note: '' }, 'PATCH')).status,
      400,
    );
    assert.equal(
      (
        await call(
          `/actions/${action.id}`,
          {
            status: 'resolved',
            note: 'Inspection confirmed the manufacturing defect.',
            inspection: { assessment: 'confirmed', sampled: 10, failed: 8 },
          },
          'PATCH',
        )
      ).status,
      200,
    );
    assert.equal(
      (await call(`/actions/${action.id}`, { status: 'approved' }, 'PATCH')).status,
      409,
    );
    const exported = await fetch(base + `/api/export/${investigation.id}`);
    assert.match(exported.headers.get('content-disposition'), /attachment/);
    assert.equal((await exported.json()).id, investigation.id);
    const repeat = await (
      await call('/investigate', {
        productId: 'SKU-AURA',
        question: 'Recall the previous investigation',
      })
    ).json();
    assert.equal(repeat.investigation.evidence.memory.actions[0].status, 'resolved');
    assert.equal(repeat.investigation.cohortConclusion.kind, 'shared_component');
    assert.equal(repeat.investigation.cohortConclusion.feedback, undefined);
    assert.equal(repeat.investigation.conclusion.feedback.status, 'confirmed');
    const saved = await (await fetch(base + '/api/investigations')).json();
    assert.deepEqual(saved[0].cohortConclusion, repeat.investigation.cohortConclusion);
    assert.equal(repeat.action.id, action.id);
    assert.equal((await fetch(base + '/api/export/not-found')).status, 404);
  } finally {
    child.kill();
    await new Promise((resolve) => {
      if (child.exitCode !== null) resolve();
      else child.once('exit', resolve);
    });
    assert.equal(path.dirname(path.resolve(directory)), path.resolve(tmpdir()));
    assert.ok(path.basename(directory).startsWith('returntrace-api-'));
    await rm(directory, { recursive: true, force: true });
  }
});
