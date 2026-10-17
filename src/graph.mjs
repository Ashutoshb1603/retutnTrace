// Show different contexts without implying that the visual sample is a rate estimate.
function diverse(paths, count) {
  const remaining = [...new Map(paths.map((p) => [p.returnId, p])).values()];
  const batches = new Set(),
    couriers = new Set(),
    selected = [];
  while (remaining.length && selected.length < count) {
    let best = 0,
      score = -1;
    for (let i = 0; i < remaining.length; i++) {
      const p = remaining[i],
        coverage = Number(!batches.has(p.batchId)) + Number(!couriers.has(p.courier));
      if (coverage > score) {
        best = i;
        score = coverage;
      }
    }
    const [path] = remaining.splice(best, 1);
    selected.push(path);
    batches.add(path.batchId);
    couriers.add(path.courier);
  }
  return selected;
}

export function sampleEvidencePaths(paths, conclusion) {
  const target = conclusion.target?.id;
  if (!target) return diverse(paths, 6);
  const matches = (p) => p.batchId === target || p.courier === target;
  const leads = paths.filter(matches),
    comparisons = paths.filter((p) => !matches(p));
  if (!leads.length) return diverse(paths, 6);
  const selected = diverse(leads, comparisons.length ? 4 : 6);
  return [...selected, ...diverse(comparisons, 6 - selected.length)];
}
