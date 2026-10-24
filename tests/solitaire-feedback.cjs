'use strict';
const assert = require('node:assert/strict');
const {runBrowserCheck} = require('./browser-support.cjs');

async function checkFeedback({page, target}, touch) {
  // Freeze time so an expired toast cannot make this regression pass by chance.
  const now = new Date('2026-01-01T12:00:00Z');
  await page.clock.install({time: now});
  await page.clock.pauseAt(now);
  await page.goto(target);
  await page.evaluate(() => {
    const original = Mahjong.Solitaire.prototype.newGame;
    Mahjong.Solitaire.prototype.newGame = function (...args) {
      original.apply(this, args);
      // Three literal, isolated pairs; use the real engine and rendered controls.
      this.tiles = [
        ['a', 0, 0, 'd1'], ['b', 2, 0, 'b3'], ['c', 4, 0, 'b3'],
        ['d', 0, 1, 'd1'], ['e', 2, 1, 'we'], ['f', 4, 1, 'we']
      ].map(([id, x, y, type]) => ({id, x, y, z: 0, tile: Mahjong.core.makeTile(type), removed: false}));
    };
  });
  const activate = selector => page.locator(selector)[touch ? 'tap' : 'click']();
  const pick = id => activate(`[data-tile-id="${id}"]`);
  const mismatch = async () => {
    await pick('a');
    await pick('b');
    assert.equal(await page.locator('.board-tile').count(), 6, 'A mismatch removes nothing');
    assert.match(await page.locator('.toast').innerText(), /do not match/);
    assert.equal(await page.locator('.board-tile.is-selected').getAttribute('data-tile-id'), 'b');
  };

  await activate('[data-act="new-sol"][aria-label="New puzzle"]');
  await mismatch();
  await pick('c');
  assert.equal(await page.locator('.board-tile').count(), 4, 'The next matching pair is removed');
  assert.equal(await page.locator('[data-tile-id="b"], [data-tile-id="c"]').count(), 0);
  assert.equal(await page.locator('.stat').nth(1).locator('strong').innerText(), '1');
  assert.equal(await page.locator('.toast').count(), 0, 'The old mismatch warning clears immediately');
  // Completing the board must still announce the win after clearing old feedback.
  for (const id of ['a', 'd', 'e', 'f']) await pick(id);
  assert.equal(await page.locator('.board-tile').count(), 0);
  assert.equal(await page.locator('.toast').innerText(), 'You cleared the board!');
  await page.clock.runFor(3500);
  assert.equal(await page.locator('.toast').count(), 0, 'Notifications still expire normally');

  await activate('[data-act="new-sol"][aria-label="New puzzle"]');
  await mismatch();
  await pick('b');
  assert.equal(await page.locator('.board-tile.is-selected').count(), 0);
  assert.equal(await page.locator('.toast').count(), 0, 'Deselecting ends the previous comparison');

  for (const selector of ['[data-act="new-sol"]', '[data-layout="garden"]', '[data-act="switch"][data-mode="hongkong"]']) {
    await mismatch();
    await activate(selector);
    assert.equal(await page.locator('.toast').count(), 0, 'Old tile feedback does not follow a new game or mode');
  }
}

(async () => {
  await runBrowserCheck('solitaire-feedback-desktop', args => checkFeedback(args, false));
  await runBrowserCheck('solitaire-feedback-touch', args => checkFeedback(args, true), {
    viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true
  });
})().catch(error => { console.error(error); process.exitCode = 1; });
