export const ROUND_RULES = {
  temperature: { label: "Temperature", unit: "°F", cap: 20, weight: 0.35 },
  precipitation: { label: "Precipitation", unit: "%", cap: 100, weight: 0.4 },
  wind: { label: "Wind", unit: "mph", cap: 30, weight: 0.25 }
};

export function classifyDisagreement(metric, difference) {
  if (difference == null) return "unavailable";
  const thresholds = { temperature: [3, 7], precipitation: [15, 35], wind: [4, 10] }[metric];
  return difference <= thresholds[0] ? "low" : difference <= thresholds[1] ? "moderate" : "high";
}

export function calculateComparison(models) {
  const paths = { temperature: "temperatureF", precipitation: "precipitationProbability", wind: "windMph" };
  const rounds = {};
  let penalty = 0;
  let usedWeight = 0;
  for (const [metric, rule] of Object.entries(ROUND_RULES)) {
    const a = models.gfs[paths[metric]];
    const b = models.ecmwf[paths[metric]];
    const available = Number.isFinite(a) && Number.isFinite(b);
    const difference = available ? Number(Math.abs(a - b).toFixed(1)) : null;
    rounds[metric] = { ...rule, gfs: a ?? null, ecmwf: b ?? null, difference, level: classifyDisagreement(metric, difference), available };
    if (available) {
      penalty += Math.min(difference / rule.cap, 1) * rule.weight;
      usedWeight += rule.weight;
    }
  }
  const agreementScore = usedWeight ? Math.round(100 * (1 - penalty / usedWeight)) : null;
  return { rounds, agreementScore, metricsCompared: Object.values(rounds).filter(r => r.available).length };
}

export function calculateTournament(models) {
  const paths = { temperature: "temperatureF", precipitation: "precipitationProbability", wind: "windMph" };
  const rounds = {};
  const modelDistances = Object.fromEntries(Object.keys(models).map(key => [key, []]));
  let penalty = 0;
  let usedWeight = 0;

  for (const [metric, rule] of Object.entries(ROUND_RULES)) {
    const values = Object.fromEntries(Object.entries(models).map(([key, model]) => [key, model[paths[metric]] ?? null]));
    const availableValues = Object.entries(values).filter(([, value]) => Number.isFinite(value));
    const available = availableValues.length >= 2;
    const numeric = availableValues.map(([, value]) => value).sort((a, b) => a - b);
    const difference = available ? Number((numeric.at(-1) - numeric[0]).toFixed(1)) : null;
    const consensus = numeric.length ? numeric[Math.floor(numeric.length / 2)] : null;
    rounds[metric] = { ...rule, values, difference, consensus, level: classifyDisagreement(metric, difference), available };
    if (available) {
      penalty += Math.min(difference / rule.cap, 1) * rule.weight;
      usedWeight += rule.weight;
      for (const [key, value] of availableValues) modelDistances[key].push(Math.abs(value - consensus) / rule.cap);
    }
  }

  const consensusDistance = Object.fromEntries(Object.entries(modelDistances).map(([key, distances]) => [key,
    distances.length ? Number((distances.reduce((sum, value) => sum + value, 0) / distances.length).toFixed(3)) : null
  ]));
  const ranked = Object.entries(consensusDistance).filter(([, value]) => value != null).sort((a, b) => a[1] - b[1]);
  return {
    rounds,
    agreementScore: usedWeight ? Math.round(100 * (1 - penalty / usedWeight)) : null,
    metricsCompared: Object.values(rounds).filter(round => round.available).length,
    closestToConsensus: ranked[0]?.[0] ?? null,
    consensusDistance,
    formulaVersion: "2.0-range"
  };
}

export function summarizeSeries(days) {
  const scores = days.map(day => day.comparison.agreementScore).filter(Number.isFinite);
  if (!scores.length) return { averageAgreement: null, trend: "unavailable", mostContentiousMetric: null };
  const metricTotals = {};
  for (const day of days) for (const [key, round] of Object.entries(day.comparison.rounds)) {
    if (round.available) metricTotals[key] = (metricTotals[key] || 0) + round.difference / round.cap;
  }
  const mostContentiousMetric = Object.entries(metricTotals).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const delta = scores.at(-1) - scores[0];
  return {
    averageAgreement: Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length),
    trend: Math.abs(delta) < 4 ? "steady" : delta > 0 ? "converging" : "diverging",
    mostContentiousMetric
  };
}
