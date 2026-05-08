import dotenv from "dotenv";
dotenv.config();

import app from "./app";
import { startAmwalRenewalCron } from "./modules/payments/amwal.cron";

const PORT = parseInt(process.env.PORT || "5000", 10);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);

  // Daily Amwal Pay-by-Token renewal cron. Runs in production by default;
  // set AMWAL_RENEWAL_CRON_ENABLED=true to run it in dev/test as well.
  const cronEnabled =
    process.env.AMWAL_RENEWAL_CRON_ENABLED === "true" ||
    process.env.NODE_ENV === "production";
  if (cronEnabled) {
    startAmwalRenewalCron();
  } else {
    console.log("[renewal-cron] not started (NODE_ENV != production)");
  }
});
