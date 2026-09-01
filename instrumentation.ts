// Next.js' official "run once at server boot" hook (stable since Next 15) —
// used here to start the extra-info reminder scheduler and the scheduled-
// communications scheduler. Pterodactyl runs this app as one persistent
// `next start` process, so simple intervals are sufficient; no external
// cron needed (see project plan).
const ONE_HOUR_MS = 60 * 60 * 1000;
const FIVE_MINUTES_MS = 5 * 60 * 1000;

const globalForScheduler = globalThis as unknown as {
  extraInfoSchedulerStarted?: boolean;
  campaignSchedulerStarted?: boolean;
  registrationWindowSchedulerStarted?: boolean;
  mediaVisibilitySchedulerStarted?: boolean;
};

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // sharp sizes its thread pool from os.cpus(), which inside a container
  // reports the *host's* cores rather than the container's limit — the same
  // trap that OOM-killed `next build` (see next.config.ts). Decoding a 24MP
  // photo already costs ~70MB of raw pixels, so a dozen threads plus the
  // 50MB libvips cache can push a small container over its memory ceiling and
  // get the process killed mid-upload. One thread and no cache is plenty:
  // derivations happen one image at a time and each file is touched once.
  const sharp = (await import("sharp")).default;
  sharp.concurrency(Math.max(1, Number(process.env.SHARP_CONCURRENCY) || 1));
  sharp.cache(false);

  // Next dev's hot-reload can re-invoke register() on file changes — guard
  // against stacking up duplicate intervals (and duplicate mails) across
  // reloads.
  if (!globalForScheduler.extraInfoSchedulerStarted) {
    globalForScheduler.extraInfoSchedulerStarted = true;

    const { runExtraInfoReminderCheck } = await import("@/lib/notifications/extraInfo");
    const tick = () => {
      runExtraInfoReminderCheck().catch((error) => {
        console.error("[extraInfoReminder] check failed:", error);
      });
    };
    tick(); // also catch anything already due at boot, not just after the first hour
    setInterval(tick, ONE_HOUR_MS);
  }

  if (!globalForScheduler.campaignSchedulerStarted) {
    globalForScheduler.campaignSchedulerStarted = true;

    const { runScheduledCampaignsCheck } = await import("@/lib/notifications/campaigns");
    // A scheduled send-time should go out promptly after the chosen moment,
    // so this ticks every 5 minutes rather than hourly.
    const tick = () => {
      runScheduledCampaignsCheck().catch((error) => {
        console.error("[scheduledCampaigns] check failed:", error);
      });
    };
    tick();
    setInterval(tick, FIVE_MINUTES_MS);
  }

  if (!globalForScheduler.registrationWindowSchedulerStarted) {
    globalForScheduler.registrationWindowSchedulerStarted = true;

    const { runRegistrationWindowCheck } = await import("@/lib/notifications/registrationWindow");
    const tick = () => {
      runRegistrationWindowCheck().catch((error) => {
        console.error("[registrationWindow] check failed:", error);
      });
    };
    tick();
    setInterval(tick, FIVE_MINUTES_MS);
  }

  if (!globalForScheduler.mediaVisibilitySchedulerStarted) {
    globalForScheduler.mediaVisibilitySchedulerStarted = true;

    const { runMediaVisibilityCheck } = await import("@/lib/notifications/mediaVisibility");
    const tick = () => {
      runMediaVisibilityCheck().catch((error) => {
        console.error("[mediaVisibility] check failed:", error);
      });
    };
    tick();
    setInterval(tick, FIVE_MINUTES_MS);
  }
}
