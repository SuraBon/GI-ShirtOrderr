import { chromium } from 'playwright';

const baseUrl = process.env.RESPONSIVE_CHECK_URL || 'http://127.0.0.1:5173';
const viewports = [
  { width: 320, height: 720 },
  { width: 375, height: 812 },
  { width: 768, height: 1024 },
  { width: 1280, height: 900 },
];
const paths = ['/', '/#/dashboard'];
const seriousConsoleTypes = new Set(['error']);

function isIgnoredConsoleMessage(text) {
  return /Failed to load resource|404|ERR_ABORTED|favicon/i.test(text);
}

const browser = await chromium.launch();
const failures = [];

try {
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    const consoleErrors = [];

    page.on('console', (message) => {
      const text = message.text();
      if (seriousConsoleTypes.has(message.type()) && !isIgnoredConsoleMessage(text)) {
        consoleErrors.push(text);
      }
    });

    for (const path of paths) {
      const url = new URL(path, baseUrl).toString();
      await page.goto(url, { waitUntil: 'networkidle' });

      if (path.includes('dashboard')) {
        await page.evaluate(() => {
          sessionStorage.setItem('gi-dashboard-admin-token', 'responsive-check');
        });
        await page.reload({ waitUntil: 'networkidle' });
      }

      const metrics = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
        hasOverlay:
          Boolean(document.querySelector('vite-error-overlay')) ||
          Boolean(document.querySelector('[data-nextjs-dialog-overlay]')) ||
          Boolean(document.querySelector('[data-plugin="vite:react-babel"]')),
      }));

      if (metrics.scrollWidth > metrics.innerWidth) {
        failures.push(`${path} ${viewport.width}px overflow: ${metrics.scrollWidth} > ${metrics.innerWidth}`);
      }
      if (metrics.hasOverlay) {
        failures.push(`${path} ${viewport.width}px has framework overlay`);
      }
    }

    if (consoleErrors.length) {
      failures.push(`${viewport.width}px console errors: ${consoleErrors.slice(0, 3).join(' | ')}`);
    }

    await context.close();
  }
} finally {
  await browser.close();
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log(`Responsive overflow check passed for ${paths.join(', ')} at ${baseUrl}`);
