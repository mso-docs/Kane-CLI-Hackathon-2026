import test from "node:test";
import assert from "node:assert/strict";
import { fetchObservedWeather } from "../src/observed.js";

test("normalizes archived ERA5 values at the requested hour", async () => {
  const fetcher = async () => ({ ok: true, json: async () => ({ hourly: { time: ["2026-08-01T16:00"], temperature_2m: [82.24], precipitation: [0.12], wind_speed_10m: [9.87] } }) });
  const result = await fetchObservedWeather({ latitude: 1, longitude: 2, timezone: "UTC", forecastTime: "2026-08-01T16:00" }, fetcher);
  assert.deepEqual(result, { forecastTime: "2026-08-01T16:00", temperatureF: 82.2, precipitationInches: 0.12, windMph: 9.9, source: "Open-Meteo ERA5 gridded historical weather" });
});
