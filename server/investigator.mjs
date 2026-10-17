import { randomUUID } from 'node:crypto';
import { chooseConclusion, compareCohorts } from './analysis.mjs';
import { openEvidenceSession } from './evidence-tools.mjs';
import { llmConfigured, modelChoice } from './model.mjs';
import { makeIntervention } from './interventions.mjs';
import { cohortConclusion, connectedConclusion } from './connected-evidence.mjs';
export { llmConfigured, modelChoice, makeIntervention, connectedConclusion };

export function nextTools(evidence, done, question) {
  const options = [];
  for (const name of ['recall_cases', 'inspect_batches', 'inspect_couriers', 'inspect_warehouses'])
    if (!done.has(name))
      return [
        { name, reason: 'Establish prior outcomes and compare the three competing explanations.' },
      ];
  const signal = ['batch', 'courier', 'warehouse'].some((d) =>
    compareCohorts(evidence[d] || []).some((r) => r.strong),
  );
  if (signal && !done.has('check_confounding'))
    options.push({
      name: 'check_confounding',
      reason: 'An elevated cohort requires a within-context explanation check.',
    });
  if (chooseConclusion(evidence).kind === 'batch_defect' && !done.has('trace_components'))
    options.push({
      name: 'trace_components',
      reason:
        'The batch signal survived courier checks. Follow its component lots to related products.',
    });
  if (/fraud|abuse|account|household|device/i.test(question) && !done.has('check_accounts'))
    options.push({
      name: 'check_accounts',
      reason:
        'The question requests account context; shared households alone cannot establish abuse.',
    });
  if (!done.has('trace_paths'))
    options.push({
      name: 'trace_paths',
      reason: 'Attach source IDs so the recommendation can be audited.',
    });
  return options;
}

export async function investigate(store, { productId, question }, emit = () => {}, options = {}) {
  const product = (await store.products()).find((p) => p.id === productId);
  if (!product) throw Error('Unknown product');
  const evidence = {},
    trace = [],
    done = new Set(),
    session = await openEvidenceSession(store, productId);
  let modelCalls = 0,
    fallback = false;
  const useModel = options.useModel ?? llmConfigured(),
    budget = Math.min(3, Math.max(0, Number(process.env.LLM_MAX_ROUNDS || 3)));
  emit({ type: 'started', productId });
  try {
    for (let round = 0; round < 8; round++) {
      const eligible = nextTools(evidence, done, question);
      if (!eligible.length) break;
      let choice = eligible[0],
        selection = 'evidence policy';
      if (useModel && !fallback && modelCalls < budget && done.size >= 4) {
        modelCalls++;
        try {
          const name = await (options.chooseTool || modelChoice)({
            options: eligible,
            evidence,
            question,
            product,
            messages: trace,
          });
          if (!eligible.some((o) => o.name === name))
            throw Error('Tool is not available in this evidence state');
          choice = eligible.find((o) => o.name === name);
          selection = 'LLM';
        } catch {
          fallback = true;
          emit({
            type: 'notice',
            message:
              'The model could not select a valid next tool. Continuing with the evidence policy.',
          });
        }
      }
      const { name, reason } = choice,
        t = session.definitions[name],
        start = performance.now();
      emit({ type: 'step_start', name, label: t.label });
      const value = await session.call(name);
      evidence[t.key] = value;
      done.add(name);
      const step = {
        name,
        label: t.label,
        reason,
        selection,
        transport: 'MCP',
        query: t.query,
        params: { productId },
        durationMs: Math.round(performance.now() - start),
        rows: Array.isArray(value) ? value.length : value.cases.length,
        summary: Array.isArray(value)
          ? `${value.length} evidence rows retrieved`
          : `${value.cases.length} prior cases; ${value.inspections.length} structured inspections`,
        backend: store.kind,
      };
      trace.push(step);
      emit({ type: 'step', step });
    }
  } finally {
    await session.close();
  }
  const conclusion = connectedConclusion(evidence);
  const investigation = {
    id: `INV-${randomUUID().slice(0, 8).toUpperCase()}`,
    productId,
    productName: product.name,
    question,
    createdAt: new Date().toISOString(),
    mode: useModel
      ? `Adaptive LLM agent${fallback ? ' · policy fallback' : ''}`
      : 'Adaptive evidence-policy agent',
    modelCalls,
    backend: store.kind,
    cohortConclusion: cohortConclusion(evidence),
    conclusion,
    evidence,
    trace,
    accountSummary: evidence.accounts
      ? 'Household links were checked; shared addresses are not proof of abuse.'
      : 'Account analysis was not requested. No customer fraud classification was made.',
    methodology:
      'Mature 30-day cohorts. Minimum 30 orders per comparison, five returns, eight percentage-point difference, 2x lift and non-overlapping 95% Wilson intervals. Batch/courier leads require two supporting strata. A shared-component lead must independently meet these checks in at least two products. Reported inspections inform follow-up actions, not cohort counts. Exploratory associations, not causal proof.',
  };
  await store.saveInvestigation(investigation);
  const action = await store.createAction(makeIntervention(investigation));
  emit({ type: 'complete', investigation, action });
  return { investigation, action };
}
