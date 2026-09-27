export const resourceWeights = Object.freeze({
  benefit: 25,
  authority: 20,
  lifecycle: 15,
  cost: 10,
  complexity: 10,
  maintenance: 10,
  interoperability: 5,
  accessibility: 5,
});

function band(value, limits) {
  return 5 - limits.filter((limit) => value > limit).length;
}

export function scoreResourceStrategies(measurement, inspection) {
  const scores = {};
  for (const [strategy, review] of Object.entries(inspection.strategies)) {
    const lines = review.sourceFiles.reduce((total, path) => {
      const source = measurement.sourceInventory.find((file) => file.path === path);
      if (!source) throw new Error(`Missing measured source: ${path}`);
      return total + source.nonblankNoncommentLines;
    }, 0);
    const annualHours =
      8 +
      4 * Math.ceil(lines / 100) +
      2 * review.concepts.length +
      4 * review.externalPackages.length +
      2 * review.ownedAsyncTransitions.length;
    const gzip = measurement.graphs[strategy].gzip - measurement.graphs.baseline.gzip;
    const samples = measurement.samples.filter((sample) => sample.strategy === strategy);
    const summaries = measurement.summaries.filter((summary) => summary.strategy === strategy);
    if (samples.length !== 15 || summaries.length !== 3)
      throw new Error(`Incomplete measurement: ${strategy}`);
    const categories = {
      benefit:
        (review.semanticMatrix ? 3 : 0) +
        Number(samples.every((sample) => sample.coldOriginReads === 1)) +
        Number(summaries.every((summary) => summary.warmMedianMs <= 25)),
      authority:
        Number(review.initialHtmlAndNoJs) * 2 +
        Number(review.serverWriteAuthority) * 2 +
        Number(!review.clientReadRenderer),
      lifecycle: Object.values(review.lifecycle).filter(Boolean).length,
      cost: band(gzip, [5_120, 15_360, 30_720, 61_440]),
      complexity: band(lines, [100, 200, 400, 800]),
      maintenance: band(annualHours, [24, 48, 96, 192]),
      interoperability: Object.values(review.interoperability).filter(Boolean).length,
      accessibility: Object.values(review.accessibility).filter(Boolean).length,
    };
    const contributions = Object.fromEntries(
      Object.entries(resourceWeights).map(([category, weight]) => [
        category,
        (weight * categories[category]) / 5,
      ]),
    );
    scores[strategy] = {
      lines,
      annualHours,
      annualHoursRange: [annualHours * 0.5, annualHours * 1.5],
      incrementalGzipBytes: gzip,
      categories,
      contributions,
      total: Object.values(contributions).reduce((a, b) => a + b, 0),
      hardGatesPass: Object.values(review.hardGates).every(Boolean),
    };
  }
  return scores;
}

function combinations(length) {
  const rows = [[]];
  for (let index = 0; index < length; index += 1) {
    const previous = rows.splice(0);
    for (const row of previous)
      for (const multiplier of [0.5, 1, 1.5]) rows.push([...row, multiplier]);
  }
  return rows;
}

export function resourceSensitivity(scores, nativeApproved) {
  const strategies = Object.keys(scores);
  const categories = Object.keys(resourceWeights);
  const wins = Object.fromEntries(strategies.map((strategy) => [strategy, 0]));
  const eligible = strategies.filter(
    (strategy) => scores[strategy].hardGatesPass && (strategy !== "native" || nativeApproved),
  );
  if (eligible.length === 0) throw new Error("No strategy passed its approval gates.");
  const eligibleWins = Object.fromEntries(eligible.map((strategy) => [strategy, 0]));
  let ties = 0;
  let existingCompositionWithinTwo = 0;
  let trials = 0;
  const maintenanceCases = combinations(strategies.length);
  for (const multipliers of combinations(categories.length)) {
    const weights = categories.map(
      (category, index) => resourceWeights[category] * multipliers[index],
    );
    const denominator = weights.reduce((a, b) => a + b, 0);
    for (const maintenance of maintenanceCases) {
      const totals = strategies.map((strategy, index) =>
        categories.reduce((total, category, categoryIndex) => {
          const score =
            category === "maintenance"
              ? band(scores[strategy].annualHours * maintenance[index], [24, 48, 96, 192])
              : scores[strategy].categories[category];
          return total + (100 * weights[categoryIndex] * score) / (5 * denominator);
        }, 0),
      );
      const best = Math.max(...totals);
      const winners = strategies.filter(
        (_strategy, index) => Math.abs(totals[index] - best) < 1e-8,
      );
      if (winners.length === 1) wins[winners[0]] += 1;
      else ties += 1;
      if (best - totals[strategies.indexOf("server")] < 2 - 1e-8) existingCompositionWithinTwo += 1;
      const ranked = [...eligible].sort(
        (left, right) => totals[strategies.indexOf(right)] - totals[strategies.indexOf(left)],
      );
      const eligibleBest = ranked[0];
      const chosen =
        eligible.includes("server") &&
        totals[strategies.indexOf(eligibleBest)] - totals[strategies.indexOf("server")] < 2 - 1e-8
          ? "server"
          : eligibleBest;
      eligibleWins[chosen] += 1;
      trials += 1;
    }
  }
  return {
    weightMultipliers: [0.5, 1, 1.5],
    maintenanceMultipliers: [0.5, 1, 1.5],
    trials,
    strictScoreWins: wins,
    exactTies: ties,
    existingCompositionWithinTwo,
    eligiblePolicyWins: eligibleWins,
    nativeApproved,
    eligibilityAssumption:
      "Hard-gate failures are excluded. Native also requires the separately inspected approval conditions. Server wins an eligible score gap below two points.",
  };
}
