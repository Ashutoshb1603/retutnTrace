# ReturnTrace demo script — version 2

Keep the FalkorDB connected badge and Synthetic data label visible. Use the exact agent mode shown in the app. The local workspace now uses Groq's `openai/gpt-oss-20b`; a live Aura investigation was verified on October 17 with three successful model calls and no fallback. The source archive contains no credentials, so a fresh setup runs the evidence policy until a key is configured.

## 0:00–0:20 — The problem

“A return dashboard shows which product is struggling. ReturnTrace investigates the connections behind it and turns the evidence into an inspection ticket.”

Start on **Returns review**. Show 120 returned orders out of 960 mature orders and the product triage table. These are deliberately planted synthetic scenarios. The elevated-rates filter keeps the review focused; **All products** also shows Nova's baseline rate.

## 0:20–1:15 — The connection

Click **Investigate** for Aura Pro. The **Case files** screen opens the live **Run log**: compare batches, couriers and warehouses; test the association across courier groups; then follow component lots because the batch signal survived. Select **Findings** to review the completed result.

“Aura's batch has 32 returns from 80 orders, compared with eight from 160 elsewhere. Following its component lot, DSP-X17, reaches a different product: Lyra. Lyra independently has 24 out of 80 returns with this lot versus eight out of 160 in its other lots. Both signals hold across four couriers.”

Show **Inspection scope**: 160 delivered orders, 56 returned orders, two products. Explain that this identifies the cohort to investigate, not 160 defective units.

Open **Connections** to show the supplier → shared lot → product map and selectable source paths. **Source records** contains the retrieved records; **Run log** exposes the executed tools and Cypher. Describe this as a shared-component lead that requires inspection.

## 1:15–2:05 — Act, then use the outcome

Open **Inspection queue**, filter **Needs approval**, and choose **Review ticket**. Show its checklist, source IDs, and download. **Approve and create ticket** creates a persistent local ticket; the operator performs the inspection. The task moves to **In progress**, where **Record inspection** captures the result.

Record a clearly labeled simulated result. To demonstrate a changed recommendation, use a fresh target/task with a refuted sample: “DEMO ONLY: independent simulated inspection of 12 units did not reproduce the suspected failure. No physical inspection occurred.” Choose Refuted, tested 12, reproducing failure 0.

Rerun the connected product. Show the independent-review recommendation, **What the inspection changes**, and the inspection-memory panel. The decision check contrasts cohort evidence alone with the added inspection and labels the next action as changed. A confirmed report can instead retain the action; the UI labels that honestly. Confirmed outcomes instead add reported support; conflicting reports require review. Existing terminal tickets cannot be silently rewritten. The provided workspace already contains a clearly labeled confirmed 8/10 demo sample; use a separate demo graph for a fresh recording if desired.

Optional GitHub delivery is a separate explicit Send action and requires credentials. Do not claim an issue was published unless it actually was.

## 2:05–2:40 — Challenge the agent

Investigate Pulse Mini: the recommendation changes to a ParcelFlow handling audit, and the component-expansion tool is skipped. Investigate Nova Studio: it abstains and requests more evidence.

Explain that these are different evidence-driven paths through the same scoped MCP tools. Optional LLM selection is limited to three provider requests and cannot skip the mandatory checks.

For live-model proof, open **Run log** in Aura case INV-96B5D093. It shows Adaptive LLM agent, three model requests, and Selected by model on the confounding, component, and source-path checks. Reopening this saved case uses no additional model quota.

## 2:40–3:00 — Close

“FalkorDB connects commerce evidence with investigation history and inspection outcomes. The graph changes which tools run, which explanation survives, and which task is proposed. Every number has an order denominator and inspectable query.”

Show the repository setup instructions and verification results. All test outcomes concern synthetic examples; no real-world accuracy claim, stock change or refund action is implied.
