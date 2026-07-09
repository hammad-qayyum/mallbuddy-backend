/**
 * PM2 process definitions for the MallBuddy backend (GAP-014).
 *
 * Production and staging are SEPARATE CLONES of this repo on the server,
 * each with its own .env (dotenv loads it from the process cwd):
 *   /root/mallbuddy-app/mallbuddy-backend           → production (port 5000)
 *   /root/mallbuddy-app/mallbuddy-backend-staging   → staging    (port 5001)
 *
 * Usage on the VPS:
 *   pm2 start ecosystem.config.js --only mallbuddy-backend
 *   pm2 start ecosystem.config.js --only mallbuddy-backend-staging
 *   pm2 save
 *
 * See docs/STAGING.md for the full staging setup runbook.
 */
module.exports = {
  apps: [
    {
      name: "mallbuddy-backend",
      cwd: "/root/mallbuddy-app/mallbuddy-backend",
      script: "dist/server.js",
      instances: 1,
      autorestart: true,
      max_memory_restart: "512M",
    },
    {
      name: "mallbuddy-backend-staging",
      cwd: "/root/mallbuddy-app/mallbuddy-backend-staging",
      script: "dist/server.js",
      instances: 1,
      autorestart: true,
      max_memory_restart: "512M",
    },
  ],
};
