export function fallbackCommentary(result) {
  const available = Object.entries(result.comparison.rounds).filter(([, r]) => r.available);
  if (!available.length) return "Both corners are quiet—the provider did not return comparable values for this hour.";
  const [mainKey, main] = available.sort((a, b) => (b[1].difference / b[1].cap) - (a[1].difference / a[1].cap))[0];
  if (main.level === "low") return `A technical draw so far: GFS and ECMWF stay close across ${available.length === 3 ? "all three rounds" : "the available rounds"}.`;
  const higher = main.gfs > main.ecmwf ? "GFS" : "ECMWF";
  const angle = mainKey === "temperature" ? "warmer" : mainKey === "precipitation" ? "wetter" : "windier";
  return `${higher} comes out swinging with the ${angle} call. ${main.label} is the main event, while the judges record ${result.comparison.agreementScore}/100 Model Agreement.`;
}

export function tournamentCommentary(result) {
  const metric = result.seriesSummary.mostContentiousMetric;
  const label = metric ? result.days[0].comparison.rounds[metric].label.toLowerCase() : "weather";
  const closest = result.roster[result.days[0].comparison.closestToConsensus]?.name || "No model";
  const trend = result.seriesSummary.trend;
  return `${label[0].toUpperCase() + label.slice(1)} owns the center of the ring across this card. ${closest} sits closest to the three-model consensus overall—not necessarily closest to reality—while agreement is ${trend} through day three.`;
}
