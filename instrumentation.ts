// Loads the retail benchmarks when the server starts, so shop pages show them after a Render wake-up
// without someone opening the supplier console first. Costs one Channel3 credit per round per boot.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.NEXT_PHASE === "phase-production-build") return;
  const [{ roundBenchmark }, { ROUND_IDS, seedRound }] = await Promise.all([import("./lib/benchmark"), import("./lib/seed")]);
  for (const id of ROUND_IDS) {
    // Not awaited: a slow or failed lookup must never hold up the server starting.
    roundBenchmark(seedRound(id).round).catch((e) => console.error(`Benchmark warm-up for ${id} failed:`, e));
  }
}
