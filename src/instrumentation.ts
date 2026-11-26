/**
 * Runs once when a server instance starts. In production it refuses to start
 * with missing or unsafe settings (e.g. no Razorpay keys, a test payment key,
 * the console OTP provider) instead of running half-configured.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { env, productionConfigProblems } = await import("./server/env");
  const { log } = await import("./server/logger");
  if (!env().isProduction) return;

  const { errors, warnings } = productionConfigProblems();
  for (const w of warnings) log.warn("config_warning", { problem: w });
  if (errors.length) {
    for (const e of errors) log.error("config_error", { problem: e });
    throw new Error(`Production configuration is incomplete (${errors.length} problem(s)); see config_error logs. Run \`npm run check-env\` locally for details.`);
  }
  log.info("config_ok", { appEnv: env().appEnv });
}
