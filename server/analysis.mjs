const screeningRules = {
  minimumOrders: 30,
  minimumReturns: 5,
  minimumRateDifference: 0.08,
  minimumLift: 2,
  minimumStratumOrders: 10,
  requiredSupportingStrata: 2,
};

function total(rows, field) {
  return rows.reduce((sum, row) => sum + row[field], 0);
}

export function wilson(successes, sampleSize) {
  if (!sampleSize) return [0, 1];

  const zScore = 1.96;
  const proportion = successes / sampleSize;
  const denominator = 1 + zScore ** 2 / sampleSize;
  const center = (proportion + zScore ** 2 / (2 * sampleSize)) / denominator;
  const margin =
    (zScore *
      Math.sqrt(
        (proportion * (1 - proportion)) / sampleSize + zScore ** 2 / (4 * sampleSize ** 2),
      )) /
    denominator;

  return [Math.max(0, center - margin), Math.min(1, center + margin)];
}

export function compareCohorts(rows) {
  const totalOrders = total(rows, 'orders');
  const totalReturns = total(rows, 'returns');

  return rows
    .map((row) => {
      const rate = row.orders ? row.returns / row.orders : 0;
      const otherOrders = totalOrders - row.orders;
      const otherReturns = totalReturns - row.returns;
      const otherRate = otherOrders ? otherReturns / otherOrders : 0;
      const interval = wilson(row.returns, row.orders);
      const otherInterval = wilson(otherReturns, otherOrders);
      const enoughData =
        row.orders >= screeningRules.minimumOrders &&
        otherOrders >= screeningRules.minimumOrders &&
        row.returns >= screeningRules.minimumReturns;
      const strong =
        enoughData &&
        rate - otherRate >= screeningRules.minimumRateDifference &&
        rate >= screeningRules.minimumLift * Math.max(otherRate, 0.01) &&
        interval[0] > otherInterval[1];

      return {
        ...row,
        rate,
        otherRate,
        otherOrders,
        otherReturns,
        interval,
        otherInterval,
        lift: otherRate ? rate / otherRate : null,
        strong,
        excess: Math.max(0, row.returns - row.orders * otherRate),
      };
    })
    .sort((left, right) => right.rate - left.rate);
}

function checkComparisonGroups(lead, strata) {
  // Warehouse associations need another stratification before we can act on them.
  if (lead.dimension === 'warehouse') return [];
  const targetField = lead.dimension === 'batch' ? 'batchId' : 'courier';
  const contextField = lead.dimension === 'batch' ? 'courier' : 'batchId';
  const contexts = [...new Set(strata.map((row) => row[contextField]))];

  return contexts.map((context) => {
    const group = strata.filter((row) => row[contextField] === context);
    const exposed = group.filter((row) => row[targetField] === lead.id);
    const comparison = group.filter((row) => row[targetField] !== lead.id);
    const orders = total(exposed, 'orders');
    const otherOrders = total(comparison, 'orders');
    const rate = orders ? total(exposed, 'returns') / orders : 0;
    const otherRate = otherOrders ? total(comparison, 'returns') / otherOrders : 0;
    return {
      context,
      orders,
      otherOrders,
      rate,
      otherRate,
      supports:
        orders >= screeningRules.minimumStratumOrders &&
        otherOrders >= screeningRules.minimumStratumOrders &&
        rate - otherRate >= screeningRules.minimumRateDifference &&
        rate >= screeningRules.minimumLift * Math.max(otherRate, 0.01),
    };
  });
}

export function chooseConclusion(evidence) {
  const candidates = ['batch', 'courier', 'warehouse']
    .flatMap((dimension) =>
      compareCohorts(evidence[dimension] || [])
        .filter((row) => row.strong)
        .map((row) => ({ ...row, dimension })),
    )
    .sort((left, right) => right.excess - left.excess);
  const lead = candidates[0];

  if (!lead)
    return {
      kind: 'inconclusive',
      strength: 'Insufficient evidence',
      title: 'No concentrated return pattern found',
      summary:
        'The observed groups do not meet the minimum sample, rate difference, and interval-separation requirements. Collect more inspection evidence before assigning a cause.',
      target: null,
      countercheck: 'No batch, courier, or warehouse passed the evidence threshold.',
      candidates,
    };

  const checks = checkComparisonGroups(lead, evidence.strata || []);
  const supportingChecks = checks.filter((check) => check.supports).length;
  if (supportingChecks < screeningRules.requiredSupportingStrata)
    return {
      kind: 'inconclusive',
      strength: 'Needs corroboration',
      title: 'A signal needs a second explanation check',
      summary: `${lead.id} has an elevated return rate, but the pattern does not persist in enough comparison groups. Inspection is needed before a targeted intervention.`,
      target: lead,
      countercheck: 'The within-context comparison did not establish a stable association.',
      checks,
      candidates,
    };

  const batchLead = lead.dimension === 'batch';
  const percent = (value) => `${(value * 100).toFixed(1)}%`;
  return {
    kind: batchLead ? 'batch_defect' : 'courier_damage',
    strength: 'Strong association',
    title: `${lead.id} is the strongest lead`,
    summary: `${lead.returns} of ${lead.orders} orders in this ${lead.dimension} were returned (${percent(lead.rate)}), compared with ${lead.otherReturns} of ${lead.otherOrders} elsewhere (${percent(lead.otherRate)}). This is an association to investigate; an inspection must confirm the cause.`,
    target: lead,
    checks,
    candidates,
    countercheck: `The elevated rate persists across ${supportingChecks} ${batchLead ? 'couriers' : 'batches'}, reducing the likelihood that ${batchLead ? 'one courier' : 'one manufacturing batch'} alone explains it.`,
  };
}
