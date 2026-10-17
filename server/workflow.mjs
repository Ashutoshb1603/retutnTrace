export function ticketDraft(action) {
  return {
    title: `[ReturnTrace] ${action.title}`,
    body: [
      `## Investigation ${action.investigationId}`,
      action.rationale,
      `Owner: ${action.owner}\nTarget: ${action.target}\nEvidence: ${(action.evidenceRefs || []).join(', ') || action.investigationId}`,
      ...(action.componentEvidence?.length
        ? [
            '## Connected product comparisons',
            ...action.componentEvidence.map(
              (p) =>
                `${p.productName} (${p.batchIds.join(', ')}): ${p.returns}/${p.orders} returned with this lot; ${p.otherReturns}/${p.otherOrders} with other lots. ${p.checks.filter((c) => c.supports).length} supporting courier comparisons.`,
            ),
          ]
        : []),
      '## Inspection checklist',
      ...action.steps.map((s) => `- [ ] ${s}`),
      '## Record the result',
      'Return to ReturnTrace and record confirmed, refuted, or inconclusive with sample counts and an inspection note.',
      'Synthetic hackathon data. No inventory, refunds, or shipping settings are changed.',
      `<!-- returntrace:${action.id} -->`,
    ].join('\n\n'),
  };
}

export function actionUpdate(old, status, note, inspection) {
  const now = new Date().toISOString();
  const updated = { ...old, status, note, updatedAt: now };
  if (status === 'approved')
    updated.ticket = old.ticket || {
      id: `TKT-${old.id.slice(4)}`,
      createdAt: now,
      ...ticketDraft(old),
    };
  if (status === 'resolved' && inspection)
    updated.inspection = {
      ...inspection,
      id: `INS-${old.id.slice(4)}`,
      actionId: old.id,
      productId: old.productId,
      targetId: old.target,
      createdAt: now,
      note,
    };
  return updated;
}

export function githubConfigured() {
  return !!(
    process.env.GITHUB_TOKEN && /^[\w.-]+\/[\w.-]+$/.test(process.env.GITHUB_REPOSITORY || '')
  );
}

// Called only by an explicit approve-and-send UI action. The model never sees
// this function or the credentials. A stable marker lets retries find an issue.
export async function publishGithubTicket(
  action,
  {
    fetcher = fetch,
    repository = process.env.GITHUB_REPOSITORY,
    token = process.env.GITHUB_TOKEN,
  } = {},
) {
  if (!token || !/^[\w.-]+\/[\w.-]+$/.test(repository || ''))
    throw Error('Configure GITHUB_REPOSITORY and GITHUB_TOKEN first.');
  const headers = {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  const base = `https://api.github.com/repos/${repository}/issues`,
    marker = `<!-- returntrace:${action.id} -->`;
  // Search all pages, including closed tickets, before retrying an uncertain POST.
  for (let page = 1; page <= 20; page++) {
    const r = await fetcher(`${base}?state=all&per_page=100&page=${page}`, {
      headers,
      signal: AbortSignal.timeout(15000),
    });
    if (!r.ok) throw Error(`GitHub lookup failed (HTTP ${r.status}). No ticket was sent.`);
    const rows = await r.json();
    const old = rows.find((i) => !i.pull_request && i.body?.includes(marker));
    if (old) return { number: old.number, url: old.html_url, repository };
    if (rows.length < 100) break;
    if (page === 20)
      throw Error(
        'Repository has too many issues to verify retry safety. Use the downloaded ticket.',
      );
  }
  const r = await fetcher(base, {
    method: 'POST',
    headers,
    signal: AbortSignal.timeout(15000),
    body: JSON.stringify(ticketDraft(action)),
  });
  if (!r.ok) throw Error(`GitHub returned HTTP ${r.status}. Reopen the preview before retrying.`);
  const issue = await r.json();
  return { number: issue.number, url: issue.html_url, repository };
}
