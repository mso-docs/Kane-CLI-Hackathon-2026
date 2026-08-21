import test from "node:test";
import assert from "node:assert/strict";
import { MODEL_POOL, normalizeForecast, normalizeForecastSeries, searchLocation } from "../src/weather.js";

test("normalizes provider-specific model series", () => {
  const raw = { hourly: { time: ["2026-08-21T15:00", "2026-08-21T16:00"], temperature_2m_gfs_seamless: [89, 91], temperature_2m_ecmwf_ifs025: [86, 87], precipitation_probability_gfs_seamless: [50, 68], precipitation_probability_ecmwf_ifs025: [25, 31], wind_speed_10m_gfs_seamless: [12, 14], wind_speed_10m_ecmwf_ifs025: [10, 11] } };
  const data = normalizeForecast(raw, "2026-08-21T16:00");
  assert.deepEqual(data.models.gfs, { temperatureF: 91, precipitationProbability: 68, windMph: 14 });
  assert.equal(data.forecastTime, "2026-08-21T16:00");
  assert.deepEqual(data.models.icon, { temperatureF: null, precipitationProbability: null, windMph: null });
});

test("builds the same local hour for a three-day fight card", () => {
  const times = ["2026-08-21T16:00", "2026-08-22T16:00", "2026-08-23T16:00"];
  const raw = { hourly: { time: times, temperature_2m_gfs_seamless: [80, 81, 82] } };
  const series = normalizeForecastSeries(raw, times[0]);
  assert.deepEqual(series.map(day => day.forecastTime), times);
  assert.deepEqual(series.map(day => day.models.gfs.temperatureF), [80, 81, 82]);
});

test("normalizes a dynamically selected global roster", () => {
  const roster = { gem: MODEL_POOL.gem, jma: MODEL_POOL.jma, access: MODEL_POOL.access };
  const raw = { hourly: { time: ["2026-08-21T12:00"], temperature_2m_gem_seamless: [70], temperature_2m_jma_seamless: [71], temperature_2m_bom_access_global: [72] } };
  const result = normalizeForecast(raw, "2026-08-21T12:00", roster);
  assert.deepEqual(Object.keys(result.models), ["gem", "jma", "access"]);
  assert.deepEqual(Object.values(result.models).map(model => model.temperatureF), [70, 71, 72]);
});

test("returns null for an invalid location", async () => {
  const result = await searchLocation("nowhere", async () => ({ ok: true, json: async () => ({ results: [] }) }));
  assert.equal(result, null);
});
