# ReturnTrace v2 verification

Verified October 16–17, 2026 (Asia/Kolkata), on this Windows computer.

## Environment and results

- Node.js 24.19.0; React 19.3.1; Vite 6.4.4; MCP SDK 1.32.1.
- Actual database: official FalkorDB v4.22.1 in Docker Desktop, TCP 127.0.0.1:6380.
- Production app: http://127.0.0.1:4317. Initial checks used no-key mode; live Groq mode was verified on October 17.
- Dataset v2: 1,920 synthetic orders; 8,866 commerce nodes plus the dataset marker; 15,575 commerce relationships before investigation history.

| Check | Result |
|---|---|
| Automated unit/API suite | 21 passed, 0 failed; includes Groq reasoning-model request compatibility |
| Frontend production build | Passed after workspace redesign; 1,595 modules transformed |
| Source formatting | Prettier check passed across src, server, shared, tests, scripts, and root configuration |
| Real FalkorDB integration | Query parity, cross-product traversal, saved tickets, structured inspections, cross-product recall, TESTS edges, deduplication and reconnect passed |
| Dataset migration | Repeat v1 → v2 import preserved history and outcomes; no duplicate nodes/edges |
| Four-product scenario evaluation | Aura/Lyra → shared component; Pulse → courier; Nova → inconclusive |
| MCP boundary | Actual SDK sessions used; tools read-only; product override rejected |
| Adaptive branches | Component expansion occurs for a corroborated batch and is skipped for courier/weak signals |
| Model behavior with mocks | Observations change each round; three-call bound; invalid tools/provider failure fall back; extra arguments rejected |
| Inspection feedback | Refuted results create independent-review tasks; conflicting reports flagged; confirmed sample support retained |
| GitHub connector with mocks | Existing issue marker prevents duplicate POST; new issue draft tested |
| Browser on real FalkorDB | Aura investigation, component comparisons, ticket preview/approval, structured simulated result, Lyra recalling the result, history after server restart |
| Browser console | No errors or warnings observed |
| Narrow panel | New evidence cards and forms inspected; fixed verdict/action layout overflow |

## Operations workspace redesign

The October 16 refactor separates pages, reusable evidence components, workspace loading, API handling, comparison rules, connected evidence, task construction, and optional model calls. The same 20-test suite, real FalkorDB integration, and four-product evaluation passed after the backend refactor.

Browser verification of the rebuilt production app covered:

- A fresh Aura investigation, INV-44FCA1F9, returned the shared-component lead and recalled the existing inspection through seven MCP evidence steps. The existing resolved task was reused.
- Findings, Connections, Source records, and Run log views; source-path selection and courier visibility.
- Return records filtered to Aura plus "Audio cuts out": 32 of 120 current-cohort returns.
- All-products triage included Nova; elevated-rates triage showed the three products above the screening threshold.
- Inspection search for ParcelFlow, ticket preview, and local approval of ACT-BE222254. TKT-BE222254 was persisted and the task moved to In progress. The outcome form opened with Save disabled until findings are entered; no new inspection result was fabricated or saved.
- Escape closed the inspection dialog and restored focus. Arrow keys moved between evidence tabs. Selecting New investigation cleared the saved case.
- Desktop review inspected at 1440 px. The temporary viewport override was reset; review and case views had document width and scroll width of 304 px in the user's narrow panel, with horizontal scrolling contained within evidence tables and tabs.
- No browser console warnings or errors were observed. The app was left open on Returns review.

The redesign screenshot is saved beside the source ZIP as `ReturnTrace-redesign.jpg`.

The live browser check created INV-0223156A (Aura), ticket TKT-2A2746D5, and a clearly labeled simulated 8/10 inspection INS-2A2746D5. Lyra investigation INV-66A3892D retrieved that inspection through the shared lot and showed “Association + reported inspection.” These are demo records, not actual inspections. Earlier saved cases and the legacy outcome remain available.

The integration script creates and deletes only a random returntrace_test_ graph. It does not remove the application graph. Unit tests use temporary fixture directories. Tests do not call a live LLM or publish a real issue.

## Limits and setup notes

Live Groq compatibility passed for one Aura investigation. Other live providers and real GitHub delivery remain unverified. Public hosting, repository publication, recording and submission remain pending. The scenario evaluation is synthetic and is not an accuracy or causality benchmark.

The Windows launcher was verified in v1 and continues to use the same production-build path. Vite hot reload in a normal unrestricted terminal is optional; the restricted shell cannot traverse a parent folder during dependency optimization. The production build works here.

The Docker engine pipe is inaccessible to the restricted shell. The app uses the database's normal TCP port. The existing container is returntrace-db, with returntrace_graph mounted at /var/lib/falkordb/data. Earlier v1 records survived an actual container restart. V2 persistence was checked by reconnecting clients and restarting the app server; a second Docker restart was not necessary for this change.

Keep this single-workspace demo local. The supplied Compose file binds ports to loopback; the manually created Docker Desktop container publishes the database port on all interfaces, with the Windows firewall prompt denied. Public deployment needs authentication and deployment controls. Multi-process transactional uniqueness is outside this prototype's scope.

## Live Groq verification — October 17

- Authenticated model discovery returned HTTP 200. The account exposed GPT-OSS 20B and 120B; the earlier Llama example was unavailable. Configured `openai/gpt-oss-20b` through Groq's OpenAI-compatible endpoint.
- The private key is stored only in the ignored `.env`. It is not included in Git, frontend assets, documentation, or the source ZIP.
- GPT-OSS requests use low reasoning effort, a 1,024-token completion ceiling, and exclude reasoning text from the response. The investigation still permits at most three model calls.
- After restarting, health reported `llmConfigured: true`, Adaptive LLM agent, and a connected FalkorDB backend.
- A browser-triggered Aura run saved **INV-96B5D093**. It made exactly **three** provider calls and completed **seven** MCP checks. The model selected `check_confounding`, `trace_components`, and `trace_paths`; the first four mandatory checks used the evidence policy.
- The saved mode is Adaptive LLM agent with no fallback. The conclusion is `shared_component`, target DSP-X17. Existing inspection history was recalled and the existing task was reused.
- The 21-test suite passed without using the live key. The single browser investigation was the only model-consuming run in this verification.

## October 17 submission preparation

- FalkorDB is the only application backend. The fixture store moved to `tests/support` and is injected only by the test entry point. Production rejects `GRAPH_BACKEND=fixture`.
- Added an inspection scope panel: the shared component cohort has 160 delivered orders, 56 returned orders, and two products. An inconclusive investigation does not invent a targeted scope.
- New investigations preserve a cohort-only conclusion alongside the inspection-informed conclusion. The decision check distinguishes a changed action from retained action; older cases without a baseline omit the comparison.
- All 24 unit/API tests passed, including scope counts, changed versus retained actions, fixture rejection, and baseline persistence through the API. The production build passed (1,597 modules).
- In an isolated browser test workspace, investigated Aura, approved a ticket, recorded a clearly labeled simulated refuted 0/12 sample, and reran. The finding changed to independent review; scope remained 160/56/two products. No live graph outcome was modified and no Groq request was made.
- The new views were checked at the normal desktop viewport and at 375px width, with no horizontal page overflow or browser warnings/errors.
- Current real-database recheck is blocked: the live health endpoint reports FalkorDB unavailable, and this shell cannot access Docker's Windows control pipe. The attempted integration run was stopped. Earlier real-FalkorDB results above remain historical results, not a pass for this latest change.

Before recording the final demo, start the existing database in Docker Desktop, restart the application, and rerun `npm run test:integration` and `npm run evaluate`.
