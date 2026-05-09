import cron, { ScheduledTask } from "node-cron";
import { processDueSubscriptionRenewals, cleanupStaleIncompleteSubscriptions } from "./amwal.renewal";

/**
 * Cron expression and timezone for the daily renewal job. Override in env
 * with `AMWAL_RENEWAL_CRON` and `AMWAL_RENEWAL_TZ` if needed.
 *
 * Default: every day at 02:00 UTC. Off-peak hours; well after midnight in
 * GST/AST so any failures email the team during normal business hours.
 */
const DEFAULT_CRON = "0 2 * * *";
// N12 — default to Oman local time so "02:00" lands in actual off-peak local
// hours and ops logs read naturally. Override via AMWAL_RENEWAL_TZ.
const DEFAULT_TZ = "Asia/Muscat";
const RENEWAL_WINDOW_HOURS = 24;
// I12 — delete INCOMPLETE rows that have been abandoned for this long.
const ORPHAN_CLEANUP_DAYS = parseInt(process.env.AMWAL_ORPHAN_CLEANUP_DAYS || "7", 10);

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
        const renewalStats = await processDueSubscriptionRenewals(RENEWAL_WINDOW_HOURS);
        // I12 — also sweep abandoned INCOMPLETE rows so the table doesn't
        // grow forever from /initiate calls that never completed payment.
        const cleanupStats = await cleanupStaleIncompleteSubscriptions(ORPHAN_CLEANUP_DAYS);
        const tookMs = Date.now() - startedAt.getTime();
        console.log("[renewal-cron] done", { ...renewalStats, cleanupDeleted: cleanupStats.deleted, tookMs });
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
