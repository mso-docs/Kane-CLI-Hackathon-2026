import test from "node:test";
import assert from "node:assert/strict";
import { evaluateModels } from "../src/evaluation.js";

test("evaluates model errors without using an LLM", () => {
  const models = {
    gfs: { temperatureF: 80, windMph: 10, precipitationProbability: 80 },
    ecmwf: { temperatureF: 75, windMph: 5, precipitationProbability: 20 },
    icon: { temperatureF: 78, windMph: 8, precipitationProbability: 60 }
  };
  const result = evaluateModels(models, { temperatureF: 78, windMph: 8, precipitationInches: 0.2 });
  assert.equal(result.winner, "icon");
  assert.equal(result.results.icon.score, 94);
  assert.equal(result.results.gfs.components.find(component => component.metric === "precipitation").error, 0.04);
});

test("renormalizes evaluation when an observed metric is missing", () => {
  const result = evaluateModels({ gfs: { temperatureF: 70, windMph: 10 } }, { temperatureF: 70, windMph: null });
  assert.equal(result.results.gfs.score, 100);
});
