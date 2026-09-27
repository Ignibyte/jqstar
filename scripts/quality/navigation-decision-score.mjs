export const navigationWeights = Object.freeze({
  browserSemantics: 25,
  demonstratedBenefit: 20,
  serverAuthority: 15,
  lifecycleSafety: 10,
  accessibility: 10,
  integrationCost: 10,
  maintenanceRisk: 10,
});

export function scoreNavigationRatings(ratings, weights = navigationWeights) {
  const keys = Object.keys(navigationWeights);
  if (
    Object.keys(ratings).length !== keys.length ||
    Object.keys(weights).length !== keys.length ||
    keys.some(
      (key) =>
        !Number.isFinite(ratings[key]) ||
        ratings[key] < 0 ||
        ratings[key] > 5 ||
        !Number.isFinite(weights[key]) ||
        weights[key] <= 0,
    )
  )
    throw new Error("Navigation scoring requires every frozen rating and positive weight.");
  const weightTotal = keys.reduce((total, key) => total + weights[key], 0);
  return (keys.reduce((total, key) => total + ratings[key] * weights[key], 0) / weightTotal) * 20;
}

export function navigationWeightSensitivity(scores) {
  if (!scores.length || !scores.some((candidate) => candidate.eligible))
    throw new Error("Navigation sensitivity requires an eligible measured candidate.");
  const keys = Object.keys(navigationWeights);
  const wins = Object.fromEntries(scores.map((candidate) => [candidate.candidate, 0]));
  let ties = 0;
  const trials = 3 ** keys.length;
  for (let trial = 0; trial < trials; trial += 1) {
    let digits = trial;
    const weights = {};
    for (const key of keys) {
      weights[key] = navigationWeights[key] * [0.75, 1, 1.25][digits % 3];
      digits = Math.floor(digits / 3);
    }
    const eligible = scores
      .filter((candidate) => candidate.eligible)
      .map((candidate) => ({
        candidate: candidate.candidate,
        total: scoreNavigationRatings(candidate.ratings, weights),
      }));
    const best = Math.max(...eligible.map((candidate) => candidate.total));
    const winners = eligible.filter((candidate) => Math.abs(candidate.total - best) < 1e-9);
    if (winners.length > 1) ties += 1;
    else wins[winners[0].candidate] += 1;
  }
  return { trials, strictWins: wins, ties };
}

export function assertCompleteNavigationMatrix(evidence, measurement) {
  if (
    !measurement ||
    measurement.contractSha256 !== evidence.contractSha256 ||
    measurement.fixtureSha256 !== evidence.fixtureIdentity?.sha256 ||
    measurement.status !== "pass"
  )
    throw new Error("Navigation completion requires a passing matching measurement.");
  const expectedRows = [];
  for (const candidate of evidence.contract.candidates) {
    for (const configuration of candidate.host === "browser"
      ? ["configured"]
      : ["default", "configured"]) {
      for (const browser of evidence.contract.browsers) {
        const key = `${candidate.id}/${configuration}/${browser}`;
        expectedRows.push(key);
        const rows = measurement.candidates.filter(
          (row) => `${row.candidate}/${row.configuration}/${row.browser}` === key,
        );
        if (rows.length !== 1)
          throw new Error(`Missing or duplicated navigation matrix row: ${key}`);
        const row = rows[0];
        if (row.flows.length !== evidence.contract.scenarios.length)
          throw new Error(`Incomplete navigation flows: ${key}`);
        for (const scenario of evidence.contract.scenarios) {
          const matches = row.flows.filter((flow) => flow.id === scenario.id);
          if (matches.length !== 1)
            throw new Error(`Missing or duplicated flow: ${key}/${scenario.id}`);
          const flow = matches[0];
          if (scenario.applicability === "javascript" && !candidate.javascript) {
            if (flow.status !== "not-applicable" || flow.assertions.length !== 0)
              throw new Error(`Invalid no-JavaScript applicability: ${key}/${scenario.id}`);
            continue;
          }
          const assertionKeys = flow.assertions.map((assertion) => assertion.key).sort();
          if (JSON.stringify(assertionKeys) !== JSON.stringify([...scenario.assertions].sort()))
            throw new Error(`Missing, duplicated or extra assertions: ${key}/${scenario.id}`);
          if (
            configuration === "configured" &&
            (flow.status !== "pass" ||
              flow.failure !== null ||
              (flow.unhandledScriptErrors ?? flow.scriptErrors) !== 0 ||
              !flow.assertions.every((assertion) => assertion.passed))
          )
            throw new Error(`Configured navigation flow failed: ${key}/${scenario.id}`);
          if (!candidate.javascript && flow.scriptRequests !== 0)
            throw new Error(`No-JavaScript baseline fetched scripts: ${key}/${scenario.id}`);
          if (
            configuration === "configured" &&
            candidate.javascript &&
            flow.state?.hasMain &&
            (!flow.disposal ||
              flow.disposal.failed !== 0 ||
              flow.disposal.remaining !== 0 ||
              flow.disposal.live !== 0 ||
              flow.disposal.created !== flow.disposal.released)
          )
            throw new Error(`Missing terminal ownership evidence: ${key}/${scenario.id}`);
        }
      }
    }
  }
  if (measurement.candidates.length !== expectedRows.length)
    throw new Error("Navigation measurement contains an unexpected matrix row.");
  return true;
}
