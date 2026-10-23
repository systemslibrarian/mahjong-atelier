'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const AxeBuilder = require('@axe-core/playwright').default;
const {runBrowserCheck} = require('./browser-support.cjs');

runBrowserCheck('accessibility', async ({page, target, artifactPath, edition}) => {
  const reports = [];
  let complete = false;
  const saveReport = () => fs.writeFile(artifactPath('accessibility.json'), JSON.stringify({
    edition, complete, tags: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'], reports
  }, null, 2));
  await saveReport();
  async function scan(screen) {
    const result = await new AxeBuilder({page})
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    reports.push({screen, violations: result.violations, incomplete: result.incomplete});
    await saveReport();
    console.log(`${screen}: ${result.violations.length} detected violations`);
  }

  await page.goto(target);
  await scan('Solitaire board');
  for (const theme of ['minimal', 'neon', 'pastel']) {
    await page.locator('[data-appearance="theme"]').selectOption(theme);
    await scan(`Solitaire ${theme} tiles`);
  }
  await page.locator('[data-appearance="theme"]').selectOption('ivory');
  await page.locator('[data-appearance="indices"]').uncheck();
  await scan('Solitaire without English indices');
  await page.locator('[data-appearance="indices"]').check();
  await page.locator('[data-act="tile-guide"]').click();
  await scan('Tile library');
  await page.locator('button[data-act="close-tile-guide"]').click();

  for (const mode of ['solitaire', 'hongkong', 'american']) {
    await page.locator(`[data-act="switch"][data-mode="${mode}"]`).click();
    if (mode !== 'solitaire') await scan(`${mode} setup`);
    await page.locator('[data-act="learn"]').first().click();
    await scan(`${mode} rule library`);
    await page.locator('[data-learn="close"]').first().click();
    await page.locator('[data-act="path"]').click();
    await page.locator('[data-stage="0"]').first().click();
    await page.locator('[data-option]').first().click();
    await scan(`${mode} learning path and answer feedback`);
    await page.keyboard.press('Escape');
    await page.locator('[data-act="practice"]').click();
    await page.locator('[data-do="hint"]').click();
    await scan(`${mode} guided practice`);
    await page.keyboard.press('Escape');
    if (mode !== 'solitaire') {
      await page.locator('[data-act="start-table"]').click();
      await scan(`${mode} active table`);
    }
  }

  await page.reload();
  await page.locator('[data-act="switch"][data-mode="hongkong"]').click();
  await page.locator('[data-act="opponents"][data-value="local"]').click();
  await page.locator('[data-act="start-table"]').click();
  await scan('Private local handoff');
  await page.locator('[data-act="reveal"]').click();
  await page.setViewportSize({width: 390, height: 844});
  await scan('Mobile Hong Kong table');
  await page.screenshot({path: artifactPath('accessibility-mobile.png'), fullPage: true});

  await page.reload();
  await scan('Mobile portrait Solitaire');
  await page.locator('[data-act="board-focus"]').click();
  await scan('Mobile focused Solitaire');

  complete = true;
  await saveReport();
  const failures = reports.flatMap(report => report.violations.map(violation => ({
    screen: report.screen,
    rule: violation.id,
    impact: violation.impact,
    affectedElements: violation.nodes.length,
    examples: violation.nodes.slice(0, 3).map(node => ({target: node.target, reason: node.failureSummary}))
  })));
  assert.deepEqual(failures, [], 'Key screens must have no automatically detected WCAG A/AA violations; manual accessibility review remains necessary.');
}).catch(error => {console.error(error); process.exitCode = 1;});
