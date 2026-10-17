import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { FixtureStore } from './support/fixture-store.mjs';
import { makeDataset } from '../server/data.mjs';
import { investigate, connectedConclusion, modelChoice } from '../server/agent.mjs';
import { openEvidenceSession } from '../server/evidence-tools.mjs';
import { publishGithubTicket } from '../server/workflow.mjs';

async function withStore(fn) {
  const directory = await mkdtemp(path.join(tmpdir(), 'returntrace-upgrade-'));
  try {
    const s = new FixtureStore({ directory });
    await s.init();
    await fn(s);
  } finally {
    assert.equal(path.dirname(directory), tmpdir());
    await rm(directory, { recursive: true, force: true });
  }
}
test('adaptive MCP path expands a batch lead but avoids component queries for a courier or weak signal', () =>
  withStore(async (s) => {
    for (const [productId, kind, expanded] of [
      ['SKU-AURA', 'shared_component', true],
      ['SKU-LYRA', 'shared_component', true],
      ['SKU-PULSE', 'courier_damage', false],
      ['SKU-NOVA', 'inconclusive', false],
    ]) {
      const { investigation: i } = await investigate(
        s,
        { productId, question: 'Why are returns increasing?' },
        () => {},
        { useModel: false },
      );
      assert.equal(i.conclusion.kind, kind);
      assert.equal(
        i.trace.some((t) => t.name === 'trace_components'),
        expanded,
      );
      assert.ok(i.trace.every((t) => t.transport === 'MCP'));
      assert.equal(i.modelCalls, 0);
    }
  }));
test('a shared component alone is insufficient without independent return-rate corroboration', () =>
  withStore(async (s) => {
    const d = makeDataset();
    for (const o of d.orders.filter((o) => o.productId === 'SKU-LYRA')) o.returned = false;
    s.dataset = d;
    const { investigation: i } = await investigate(
      s,
      { productId: 'SKU-AURA', question: 'Find the cause' },
      () => {},
      { useModel: false },
    );
    assert.equal(i.conclusion.kind, 'batch_defect');
  }));
test('inspection feedback persists and changes recommendations across connected products', () =>
  withStore(async (s) => {
    const first = await investigate(
      s,
      { productId: 'SKU-AURA', question: 'Investigate the return spike' },
      () => {},
      { useModel: false },
    );
    await s.updateAction(first.action.id, 'approved', '');
    await s.updateAction(
      first.action.id,
      'resolved',
      'Simulated inspection did not reproduce the suspected component fault.',
      { assessment: 'refuted', sampled: 12, failed: 0 },
    );
    const fresh = new FixtureStore({ directory: s.directory });
    await fresh.init();
    const second = await investigate(
      fresh,
      { productId: 'SKU-LYRA', question: 'Investigate connected component failures' },
      () => {},
      { useModel: false },
    );
    assert.equal(second.investigation.conclusion.kind, 'review_conflict');
    assert.equal(second.action.type, 'independent_review');
    assert.equal(second.investigation.conclusion.feedback.inspections[0].sampled, 12);
    const e = second.investigation.evidence;
    e.memory.inspections.push({
      ...e.memory.inspections[0],
      id: 'INS-conflicting',
      assessment: 'confirmed',
      failed: 10,
    });
    assert.equal(connectedConclusion(e).feedback.status, 'conflicting');
  }));
test('LLM follow-up selection sees new MCP observations each round and obeys a three-call budget', () =>
  withStore(async (s) => {
    const seen = [];
    const { investigation: i } = await investigate(
      s,
      { productId: 'SKU-AURA', question: 'Find the return cause' },
      () => {},
      {
        useModel: true,
        chooseTool: async ({ options, evidence }) => {
          seen.push(structuredClone(evidence));
          return options[0].name;
        },
      },
    );
    assert.equal(i.modelCalls, 3);
    assert.equal(seen[0].strata, undefined);
    assert.ok(seen[1].strata.length);
    assert.ok(seen[2].components.length);
    assert.equal(i.conclusion.kind, 'shared_component');
  }));
test('invalid or unavailable model falls back without dropping evidence checks', () =>
  withStore(async (s) => {
    const notices = [];
    const { investigation: i } = await investigate(
      s,
      { productId: 'SKU-AURA', question: 'Inspect this spike' },
      (e) => notices.push(e),
      { useModel: true, chooseTool: async () => 'delete_graph' },
    );
    assert.equal(i.conclusion.kind, 'shared_component');
    assert.equal(i.modelCalls, 1);
    assert.ok(notices.some((e) => e.type === 'notice'));
  }));
test('MCP rejects scope overrides and exposes only read-only evidence tools', () =>
  withStore(async (s) => {
    const session = await openEvidenceSession(s, 'SKU-AURA');
    try {
      const listed = await session.client.listTools();
      assert.ok(listed.tools.every((t) => t.annotations.readOnlyHint));
      const result = await session.client.callTool({
        name: 'inspect_batches',
        arguments: { productId: 'SKU-NOVA' },
      });
      assert.equal(result.isError, true);
      assert.ok((await session.call('inspect_batches')).every((r) => r.id.startsWith('AURA')));
    } finally {
      await session.close();
    }
  }));
test('model protocol passes observations and rejects changed tool arguments without using a real key', async () => {
  const before = {
    base: process.env.LLM_BASE_URL,
    key: process.env.LLM_API_KEY,
    model: process.env.LLM_MODEL,
  };
  process.env.LLM_BASE_URL = 'https://provider.invalid/v1';
  process.env.LLM_API_KEY = 'test-only';
  process.env.LLM_MODEL = 'mock';
  try {
    const input = {
      options: [{ name: 'trace_paths', reason: 'Attach source evidence' }],
      evidence: { batch: [{ id: 'batch-1', orders: 80, returns: 32 }] },
      question: 'Investigate',
      product: { name: 'Audio' },
      messages: [],
    };
    const fetcher = async (url, options) => {
      assert.match(JSON.parse(options.body).messages[1].content, /batch-1/);
      return {
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                tool_calls: [
                  { function: { name: 'trace_paths', arguments: '{"productId":"override"}' } },
                ],
              },
            },
          ],
        }),
      };
    };
    await assert.rejects(modelChoice({ ...input, fetcher }), /scope/);
  } finally {
    for (const [key, value] of Object.entries({
      LLM_BASE_URL: before.base,
      LLM_API_KEY: before.key,
      LLM_MODEL: before.model,
    })) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
test('Groq reasoning models receive a bounded completion budget and return a scoped tool', async () => {
  const keys = ['LLM_BASE_URL', 'LLM_API_KEY', 'LLM_MODEL'];
  const before = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  process.env.LLM_BASE_URL = 'https://api.groq.com/openai/v1';
  process.env.LLM_API_KEY = 'test-only';
  process.env.LLM_MODEL = 'openai/gpt-oss-20b';
  try {
    const selected = await modelChoice({
      options: [{ name: 'trace_paths', reason: 'Attach source evidence' }],
      evidence: {},
      question: 'Investigate the returns',
      product: { name: 'Audio' },
      messages: [],
      fetcher: async (url, options) => {
        const body = JSON.parse(options.body);
        assert.equal(url.href, 'https://api.groq.com/openai/v1/chat/completions');
        assert.equal(body.reasoning_effort, 'low');
        assert.equal(body.include_reasoning, false);
        assert.ok(body.max_completion_tokens > 160 && body.max_completion_tokens <= 1024);
        assert.equal(body.max_tokens, undefined);
        assert.equal(body.tool_choice, 'required');
        return {
          ok: true,
          json: async () => ({
            choices: [
              { message: { tool_calls: [{ function: { name: 'trace_paths', arguments: '{}' } }] } },
            ],
          }),
        };
      },
    });
    assert.equal(selected, 'trace_paths');
  } finally {
    for (const [key, value] of Object.entries(before)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test('GitHub retry finds a prior issue and does not create a duplicate', async () => {
  const calls = [],
    action = {
      id: 'ACT-123',
      title: 'Inspect lot',
      investigationId: 'INV-123',
      rationale: 'Test evidence',
      owner: 'QA',
      target: 'DSP-X17',
      steps: ['Inspect'],
    };
  const existing = {
    number: 7,
    html_url: 'https://github.com/example/demo/issues/7',
    body: '<!-- returntrace:ACT-123 -->',
  };
  const found = await publishGithubTicket(action, {
    repository: 'example/demo',
    token: 'test-only',
    fetcher: async (url, options) => {
      calls.push(options.method || 'GET');
      return { ok: true, json: async () => [existing] };
    },
  });
  assert.equal(found.number, 7);
  assert.deepEqual(calls, ['GET']);
  const created = await publishGithubTicket(action, {
    repository: 'example/demo',
    token: 'test-only',
    fetcher: async (url, options) => {
      if (options.method === 'POST') {
        assert.match(JSON.parse(options.body).body, /returntrace:ACT-123/);
        return { ok: true, json: async () => existing };
      }
      return { ok: true, json: async () => [] };
    },
  });
  assert.equal(created.number, 7);
});
