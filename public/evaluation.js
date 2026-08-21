export const EVALUATION_VERSION = "1.0-era5";

export function evaluateModels(models, observed) {
  const results = {};
  for (const [key, forecast] of Object.entries(models)) {
    const components = [];
    if (Number.isFinite(forecast.temperatureF) && Number.isFinite(observed.temperatureF)) {
      const error = Number(Math.abs(forecast.temperatureF - observed.temperatureF).toFixed(1));
      components.push({ metric: "temperature", error, penalty: Math.min(error / 20, 1), weight: 0.4 });
    }
    if (Number.isFinite(forecast.windMph) && Number.isFinite(observed.windMph)) {
      const error = Number(Math.abs(forecast.windMph - observed.windMph).toFixed(1));
      components.push({ metric: "wind", error, penalty: Math.min(error / 30, 1), weight: 0.25 });
    }
    if (Number.isFinite(forecast.precipitationProbability) && Number.isFinite(observed.precipitationInches)) {
      const event = observed.precipitationInches >= 0.004 ? 1 : 0;
      const probability = forecast.precipitationProbability / 100;
      const brierScore = Number(((probability - event) ** 2).toFixed(3));
      components.push({ metric: "precipitation", error: brierScore, penalty: brierScore, weight: 0.35, event });
    }
    const weight = components.reduce((sum, component) => sum + component.weight, 0);
    const penalty = components.reduce((sum, component) => sum + component.penalty * component.weight, 0);
    results[key] = { score: weight ? Math.round(100 * (1 - penalty / weight)) : null, components };
  }
  const ranking = Object.entries(results).filter(([, result]) => Number.isFinite(result.score)).sort((a, b) => b[1].score - a[1].score);
  return { results, winner: ranking[0]?.[0] ?? null, ranking: ranking.map(([key]) => key), version: EVALUATION_VERSION };
}
