# Reading the ReturnTrace code

Start with one user action: selecting a product and clicking **Run investigation**.

1. `src/main.jsx` mounts `App`. `src/app.jsx` owns the current case, selected product, and dialogs. Pages receive data and callbacks rather than fetching their own copies of the workspace.
2. `src/hooks/use-workspace.js` loads the overview, history, return records, and tasks. `src/lib/api.js` handles HTTP errors and streamed investigation updates.
3. `server/index.mjs` starts the app; `server/app.mjs` validates the request and streams progress. `server/investigator.mjs` runs the investigation through a scoped MCP session.
4. `server/evidence-tools.mjs` exposes read-only tools backed by `server/store.mjs` and the parameterized Cypher in `server/queries.mjs`.
5. `server/analysis.mjs` compares cohorts using explicit `screeningRules`. `server/connected-evidence.mjs` checks shared components and incorporates recorded inspections. `server/model.mjs` handles the optional bounded model choice.
6. `server/interventions.mjs` turns the conclusion into a task. `shared/action-types.mjs` gives the frontend and backend the same task identity rules, so a saved case finds its existing task.
7. The completed case and task are persisted. Ticket approval and inspection outcomes follow the state transitions in the API and `server/workflow.mjs`.

## Where to make changes

| Change | Start here |
|---|---|
| Product triage or review layout | `src/pages/review.jsx` |
| Case tabs and next action | `src/pages/case-file.jsx` |
| Cohort scope and inspection decision comparison | `src/components/case-impact.jsx`, `shared/case-impact.mjs` |
| Evidence tables and tool log | `src/components/case-evidence.jsx` |
| Interactive source graph | `src/components/evidence-graph.jsx` |
| Ticket preview or inspection form | `src/components/inspection-forms.jsx` |
| Queue filtering | `src/pages/inspection-queue.jsx` |
| Source record filtering | `src/pages/return-records.jsx` |
| Screening thresholds | `server/analysis.mjs` |
| New graph evidence | `server/queries.mjs`, `server/store.mjs`, `server/evidence-tools.mjs` |
| Fixture scenarios | `server/data.mjs` |

The frontend uses plain React state, small shared controls, and a single stylesheet. It has no external font dependency. Backend modules separate numerical checks, connected evidence, model selection, task construction, and orchestration.

## Before changing the investigation rules

Run `npm test`, `npm run evaluate`, and `npm run test:integration`. The integration command needs FalkorDB and uses its own temporary graph. Preserve the sample thresholds, comparison denominators, and alternative-explanation checks unless the change deliberately updates those requirements. An association is a lead for inspection; a recorded sample is evidence from that sample.

For interface changes, run `npm run build` and check the affected flow in the browser. Use `npm run format` to format source and `npm run format:check` to verify it. No model key is needed for the default workflow.

## Explain these in your own words before submitting

- Why do comparisons include delivered orders that were not returned?
- How does Aura connect to Lyra through DSP-X17, and why is sharing a lot alone insufficient?
- What does the model choose, and which checks can it never skip?
- Why does a refuted inspection trigger independent review while the return counts stay the same?
- Which operations persist in FalkorDB, and which actions still require a human operator?

The decision check compares two conclusions from the same investigation: cohort evidence alone and that evidence plus recorded inspections. It is not a comparison of return rates before and after an intervention. Older saved cases without a baseline omit this panel rather than inventing one.
