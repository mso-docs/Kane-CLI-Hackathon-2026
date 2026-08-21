import test from "node:test";
import assert from "node:assert/strict";
import { calculateComparison, calculateTournament, classifyDisagreement, summarizeSeries } from "../src/agreement.js";

test("calculates explainable weighted agreement", () => {
  const result = calculateComparison({ gfs: { temperatureF: 91, precipitationProbability: 68, windMph: 14 }, ecmwf: { temperatureF: 87, precipitationProbability: 31, windMph: 11 } });
  assert.equal(result.rounds.temperature.difference, 4);
  assert.equal(result.rounds.precipitation.level, "high");
  assert.equal(result.rounds.wind.level, "low");
  assert.equal(result.agreementScore, 76);
});

test("renormalizes weights when a round is missing", () => {
  const result = calculateComparison({ gfs: { temperatureF: 70, precipitationProbability: null, windMph: 10 }, ecmwf: { temperatureF: 70, precipitationProbability: null, windMph: 10 } });
  assert.equal(result.agreementScore, 100);
  assert.equal(result.metricsCompared, 2);
  assert.equal(result.rounds.precipitation.level, "unavailable");
});

test("uses round-specific disagreement bands", () => {
  assert.equal(classifyDisagreement("temperature", 3), "low");
  assert.equal(classifyDisagreement("temperature", 4), "moderate");
  assert.equal(classifyDisagreement("wind", 11), "high");
});

test("scores a three-model tournament by forecast range", () => {
  const result = calculateTournament({
    gfs: { temperatureF: 80, precipitationProbability: 60, windMph: 10 },
    ecmwf: { temperatureF: 76, precipitationProbability: 20, windMph: 14 },
    icon: { temperatureF: 78, precipitationProbability: 40, windMph: 12 }
  });
  assert.equal(result.rounds.temperature.difference, 4);
  assert.equal(result.rounds.temperature.consensus, 78);
  assert.equal(result.closestToConsensus, "icon");
  assert.equal(result.agreementScore, 74);
});

test("summarizes agreement direction over three days", () => {
  const comparison = score => ({ agreementScore: score, rounds: { temperature: { available: true, difference: 2, cap: 20 } } });
  const summary = summarizeSeries([{ comparison: comparison(90) }, { comparison: comparison(80) }, { comparison: comparison(70) }]);
  assert.equal(summary.averageAgreement, 80);
  assert.equal(summary.trend, "diverging");
  assert.equal(summary.mostContentiousMetric, "temperature");
});
