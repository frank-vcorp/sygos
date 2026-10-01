import { chromium } from "playwright";

/** Headless launch on hosts where `npx playwright install` is unavailable. */
export async function launchUatBrowser() {
  return chromium.launch({
    headless: true,
    channel: process.env.PLAYWRIGHT_CHANNEL || "chrome",
  });
}
