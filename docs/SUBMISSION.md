# ReturnTrace — submission draft

**Track:** Agents That Act on Connected Data

**Pitch:** ReturnTrace follows a return spike across products and shared component lots, proposes an evidence-backed inspection ticket, and uses the inspection outcome in its next investigation.

## Problem and implementation

A product-level return rate identifies a symptom. Operations needs to distinguish batch, component, courier and fulfillment explanations. ReturnTrace uses a FalkorDB commerce graph, order denominators and comparison groups to make that investigation inspectable.

The React workspace includes cohort scope, a cohort-only versus inspection-informed decision comparison, an overview, adaptive MCP tool activity, source graphs, cross-product component evidence, comparisons, exports, ticket approval and structured inspection outcomes. Approving a preview creates a persistent ticket in FalkorDB. Recorded inspections connect to their tested graph target and affect later recommendations, including across related products.

## Why the graph matters

The flagship traversal is Return → Order → Unit → Batch → ComponentLot ← another Batch ← Unit → another Product. Aura and Lyra independently show elevated return rates for shared lot DSP-X17, with courier checks in both products. Inspection → TESTS → ComponentLot links past operational findings back into new investigations. All evidence reads in an investigation pass through an actual scoped MCP server; a stdio entry point exposes the same read-only tools to external clients.

## Agent and evidence controls

The no-key adaptive policy chooses follow-up tools from observed evidence. A corroborated batch opens the component investigation; a courier lead follows a different path; weak evidence abstains. The optional LLM selects eligible next tools using fresh observations, with at most three provider calls and policy fallback. Required comparisons and numerical findings remain deterministic. Iterative LLM behavior and failures are tested with mocks. A live Groq GPT-OSS 20B investigation also passed: three successful model selections led to seven MCP evidence checks and the shared-component finding, without fallback.

A shared component alone is not enough: two products must independently meet minimum sample, lift, interval separation and courier-stratum checks. Refuted or conflicting inspection reports trigger independent review. Shared household addresses never establish fraud.

## Demonstrations and verification

- Aura and Lyra: shared component lead, respectively 40% and 30% returns versus 5% in each product's comparison lots.
- Pulse: ParcelFlow association, 45% versus 5%, corroborated across three batches.
- Nova: insufficient concentrated evidence; abstain.
- Structured inspection memory: confirmed results add reported support; refuted or conflicting results change the proposed action.

The dataset contains 1,920 synthetic orders. All 24 unit/API tests and the production build passed. The final real-FalkorDB integration suite and all four synthetic product evaluations passed on FalkorDB Cloud. See VERIFICATION.md for the actual tested scope. These planted scenarios are not a real-world benchmark.

## AI assistance and participant contribution

OpenAI Codex substantially assisted with implementation, interface design, debugging, automated tests, and documentation. The participant selected and developed the returns-investigation use case, directed the product workflow and visual revisions, and supplied the local setup and provider access. This is an AI-assisted submission; the source is not represented as entirely handwritten.

Automated and browser verification were carried out with Codex assistance. Those checks do not replace the participant's own review or understanding. Before submission, the participant should personally run the demo and explain the graph model, comparison denominators, tool-selection policy, and inspection feedback. `CODE_GUIDE.md` provides that walkthrough.

## Stack and delivery status

React, Vite, Node.js, Express, Zod, FalkorDB JavaScript client, MCP TypeScript SDK, parameterized Cypher and Docker Compose.

The app runs locally against a real FalkorDB Cloud Free instance (v4.22.0). The earlier Docker setup used v4.22.1. GitHub issue publishing is implemented behind an explicit preview/send workflow and tested with mocked responses; no actual issue was sent. Inventory and refunds are not changed.

Repository URL: https://github.com/Ashutoshb1603/retutnTrace (public, verified October 18, 2026).
Demo video URL: https://www.youtube.com/watch?v=qRwcktmLyAU
Live deployment: local app; public hosting not configured.

Demo recorded and video URL supplied by the participant. Before submission: verify video viewing access and complete the event form. Registration is confirmed by the participant. No hackathon submission has been made.
