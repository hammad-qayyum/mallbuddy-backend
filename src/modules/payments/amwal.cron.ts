import cron, { ScheduledTask } from "node-cron";
import { processDueSubscriptionRenewals } from "./amwal.renewal";

/**
 * Cron expression and timezone for the daily renewal job. Override in env
 * with `AMWAL_RENEWAL_CRON` and `AMWAL_RENEWAL_TZ` if needed.
 *
 * Default: every day at 02:00 UTC. Off-peak hours; well after midnight in
 * GST/AST so any failures email the team during normal business hours.
 */
const DEFAULT_CRON = "0 2 * * *";
const DEFAULT_TZ = "Etc/UTC";
const RENEWAL_WINDOW_HOURS = 24;

let scheduledTask: ScheduledTask | null = null;

export function startAmwalRenewalCron(): void {
  if (scheduledTask) {
    console.warn("[renewal-cron] already started — skipping duplicate registration");
    return;
  }

  const expr = process.env.AMWAL_RENEWAL_CRON || DEFAULT_CRON;
  const timezone = process.env.AMWAL_RENEWAL_TZ || DEFAULT_TZ;

  if (!cron.validate(expr)) {
    console.error(`[renewal-cron] invalid cron expression: ${expr} — cron NOT started`);
    return;
  }

  scheduledTask = cron.schedule(
    expr,
    async () => {
      const startedAt = new Date();
      console.log("[renewal-cron] tick — scanning for due subscriptions", { startedAt });
      try {
        const stats = await processDueSubscriptionRenewals(RENEWAL_WINDOW_HOURS);
        const tookMs = Date.now() - startedAt.getTime();
        console.log("[renewal-cron] done", { ...stats, tookMs });
      } catch (err: any) {
        console.error("[renewal-cron] crashed", { error: err?.message ?? err });
      }
    },
    { timezone },
  );

  console.log(`[renewal-cron] scheduled "${expr}" (${timezone})`);
}

export function stopAmwalRenewalCron(): void {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
    console.log("[renewal-cron] stopped");
  }
}
