'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {chromium} = require('playwright');

const edition = process.argv.includes('--offline') || process.env.ATELIER_EDITION === 'offline' ? 'offline' : 'modular';
const artifactDirectory = path.resolve(process.env.ATELIER_ARTIFACT_DIR || path.join(__dirname, '..', 'test-results', edition));
const artifactPath = name => path.join(artifactDirectory, name);
const target = process.env.ATELIER_URL || pathToFileURL(path.resolve(__dirname, '..', edition === 'offline' ? 'Mahjong_Atelier.html' : 'index.html')).href;

async function runBrowserCheck(name, check, contextOptions = {}) {
  await fs.mkdir(artifactDirectory, {recursive: true});
  const launch = process.env.CHROMIUM_EXECUTABLE
    ? {executablePath: process.env.CHROMIUM_EXECUTABLE, args: ['--no-sandbox', '--no-zygote', '--single-process', '--disable-gpu', '--disable-software-rasterizer', '--disable-gpu-compositing', '--use-gl=disabled']}
    : {headless: true};
  let browser, context, page, timeout;
  let tracingStarted = false;
  let checkFailed = false, failure;
  const deadline = new Promise((_, reject) => {
    timeout = setTimeout(() => reject(new Error(`${name} exceeded the three-minute limit`)), 180000);
  });
  try {
    await Promise.race([
      (async () => {
        browser = await chromium.launch({...launch, timeout: 30000});
        context = await browser.newContext({viewport: {width: 1280, height: 900}, ...contextOptions});
        await context.tracing.start({screenshots: true, snapshots: true});
        tracingStarted = true;
        page = await context.newPage();
        page.setDefaultTimeout(10000);
        page.setDefaultNavigationTimeout(30000);
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        // Reproducible deals, including across page reloads. No production randomness is changed.
        await page.addInitScript(() => {
          let seed = 0x1A7E1120;
          Math.random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
        });
        await check({page, context, browser, target, artifactPath, edition});
        assert.deepEqual(errors, [], 'No uncaught browser errors');
        await context.tracing.stop();
        tracingStarted = false;
      })(),
      deadline
    ]);
  } catch (error) {
    checkFailed = true;
    failure = error;
    if (page) await page.screenshot({path: artifactPath(`${name}-failure.png`), fullPage: true, timeout: 5000}).catch(() => {});
    if (context && tracingStarted) await context.tracing.stop({path: artifactPath(`${name}-trace.zip`)}).catch(() => {});
    throw error;
  } finally {
    clearTimeout(timeout);
    if (browser) {
      try { await browser.close(); }
      catch (cleanupError) {
        if (checkFailed) throw new AggregateError([failure, cleanupError], `${name} failed and Chromium cleanup also failed`);
        throw cleanupError;
      }
    }
  }
  console.log(`${name} passed (${edition}).`);
}

module.exports = {runBrowserCheck, artifactPath, edition, target};
