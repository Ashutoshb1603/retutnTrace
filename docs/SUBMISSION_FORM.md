# ReturnTrace submission copy

Use the field text below in the WeMakeDevs submission form. The participant supplied the recorded demo URL; project submission is not yet confirmed.

## Project name
ReturnTrace

## Tagline
Trace product returns across shared components, turn evidence into an inspection, and remember the result.

## Track
Track 01: Agents That Act on Connected Data

## Repository
https://github.com/Ashutoshb1603/retutnTrace

## Demo video
https://www.youtube.com/watch?v=qRwcktmLyAU

## Deployment or local setup
Local application connected to a real FalkorDB Cloud Free instance, with complete Docker and Node.js setup instructions in the repository README. FalkorDB is required. Run `docker compose up -d falkordb`, copy `.env.example` to `.env`, install dependencies, and run `npm run dev`. The Windows launcher is `./start.ps1`. An optional private model key enables LLM tool selection; the adaptive evidence policy runs without a paid API.

## What it does
ReturnTrace helps a returns operator investigate an elevated product return rate. It compares manufacturing batches, shipping partners, and warehouses using delivered-order denominators, then follows shared component lots into other products. The result is an inspectable finding with source records, executed Cypher, comparison groups, and a proposed inspection task. A human approves the ticket and records a structured inspection outcome. Future investigations retrieve that outcome through the graph and can change their recommendation to independent review when evidence conflicts.

## Why FalkorDB is central
The key traversal follows Return -> Order -> Unit -> Batch -> ComponentLot <- another Batch <- Unit -> another Product. A product-level dashboard cannot directly explain that two products share a suspect lot. ReturnTrace checks that each product independently has an elevated rate versus its own other lots and that the pattern persists across couriers. Investigations, interventions, tickets, and inspections persist in FalkorDB; Inspection -> TESTS -> ComponentLot makes outcomes available across connected products. Without FalkorDB, the app cannot retrieve evidence or run investigations. All agent evidence tools run through an actual scoped, read-only MCP server.

## What is different
The graph shapes the next tool and the next action. A batch lead opens shared-component investigation; a courier lead follows an audit path; weak evidence abstains. New cases preserve the cohort-only conclusion as well as the conclusion informed by inspection reports. The interface shows the inspection scope and whether the proposed action changed, without claiming a reduction in returns or that every connected unit is defective.

## Technology
React, Vite, Node.js, Express, FalkorDB, parameterized Cypher, MCP TypeScript SDK, Docker Compose, and an optional OpenAI-compatible model provider. A live Groq GPT-OSS 20B run was verified with three model selections and seven MCP evidence checks. Mandatory comparisons and numerical conclusions remain enforced by application rules.

## Validation
All 24 unit/API tests passed. The final real-FalkorDB integration suite and four-product synthetic evaluation passed on FalkorDB Cloud v4.22.0. The database was seeded with 8,867 nodes and 15,575 edges. No live model quota was consumed by those automated checks.

## Data and limitations
The dataset has 1,920 synthetic orders with deliberately planted shared-component, courier, and inconclusive scenarios. These are demonstrations, not a real-world benchmark. Cohort associations require inspection and do not establish causation. Recorded sample results are reports from that sample. Demonstration inspections are explicitly labeled as simulated. No inventory, refunds, or shipping settings are changed. Optional GitHub issue publishing has been tested with mocks; no actual external issue was sent.

## AI assistance disclosure
OpenAI Codex substantially assisted implementation, interface design, debugging, tests, and documentation. I selected and developed the returns-investigation use case, directed the product workflow and visual revisions, and supplied the local setup and provider access. This is an AI-assisted project. I remain responsible for reviewing the code and explaining the graph model, queries, architecture, and technical decisions.

## Personal review before sending
Run the working demo yourself and be ready to explain why comparison groups include orders that were not returned; why a shared lot alone is insufficient; which tools the model may select; and why a refuted inspection changes the next action without changing return counts. Review `CODE_GUIDE.md` for the implementation walkthrough.
