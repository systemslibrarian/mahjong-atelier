'use strict';
const assert = require('node:assert/strict');
const {runBrowserCheck} = require('./browser-support.cjs');

runBrowserCheck('mobile-board', async ({page, context, target, artifactPath}) => {
  const settle = () => page.waitForFunction(() => {
    const stage = document.querySelector('.solitaire-stage');
    return stage && stage.getBoundingClientRect().width <= stage.parentElement.clientWidth + 1;
  });
  const identity = () => page.locator('.board-tile').evaluateAll(tiles => tiles.map(tile => ({
    id: tile.dataset.tileId, label: tile.getAttribute('aria-label'),
    left: tile.style.left, top: tile.style.top
  })));
  async function checkBounds() {
    await settle();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No page overflow');
    assert.ok(await page.locator('.board-scroller').evaluate(el => el.scrollWidth <= el.clientWidth + 1), 'No sideways board scrolling');
    assert.ok(await page.locator('.board-tile').evaluateAll(tiles => tiles.every(tile => {
      const r = tile.getBoundingClientRect();
      return r.left >= 0 && r.right <= innerWidth + 1;
    })), 'Every tile is inside the viewport width');
    assert.ok(await page.locator('.game-tab').evaluateAll(tabs => tabs.every(tab => {
      const r = tab.getBoundingClientRect();
      return r.left >= 0 && r.right <= innerWidth;
    })), 'All three game tabs fit');
  }

  for (const width of [320, 360, 390, 430, 620]) {
    await page.setViewportSize({width, height: 844});
    await page.goto(target);
    assert.equal(await page.locator('[data-layout="portrait"]').getAttribute('aria-pressed'), 'true');
    assert.equal(await page.locator('.board-tile').count(), 144);
    await checkBounds();
    const tile = await page.locator('.board-tile').first().boundingBox();
    assert.ok(tile.width >= 43 && tile.height >= 53, `${width}px phone keeps legible tile targets`);
    const board = await page.locator('.board-frame').boundingBox();
    const appearance = await page.locator('.appearance-bar').boundingBox();
    assert.ok(board.y < 350 && appearance.y > board.y + board.height, 'Game appears before the style and lesson panels');
    await page.screenshot({path: artifactPath(`portrait-${width}.png`)});
  }

  await page.setViewportSize({width: 390, height: 844});
  await page.goto(target);
  const original = await identity();
  await page.locator('[data-act="board-focus"]').tap();
  assert.deepEqual(await identity(), original, 'Focus does not redeal');
  assert.ok(await page.locator('.masthead').isHidden());
  const focused = await page.locator('.board-frame').boundingBox();
  const controls = await page.locator('.solitaire-toolbar').boundingBox();
  assert.ok(focused.y >= 0 && focused.y + focused.height <= controls.y + 1, 'Focused board stays above the controls');
  assert.ok(controls.y + controls.height <= 845, 'Focused controls fit in the phone height');
  await page.screenshot({path: artifactPath('portrait-focus.png')});

  await page.locator('[data-act="hint"]').tap();
  const pair = await page.locator('.board-tile.is-hint').evaluateAll(ts => ts.map(t => t.dataset.tileId));
  assert.equal(pair.length, 2);
  for (const id of pair) await page.locator(`[data-tile-id="${id}"]`).tap();
  assert.equal(await page.locator('.board-tile').count(), 142, 'Real touch taps remove a legal pair');
  assert.equal(await page.locator('[data-act="board-focus"]').getAttribute('aria-pressed'), 'true');
  await page.locator('[data-act="undo"]').tap();
  assert.deepEqual(await identity(), original, 'Undo restores the same deal');

  // Browser pinch zoom remains available on the board and on the tile buttons.
  const cdp = await context.newCDPSession(page);
  const fingers = distance => [
    {id: 0, x: 195 - distance, y: 400, radiusX: 1, radiusY: 1},
    {id: 1, x: 195 + distance, y: 400, radiusX: 1, radiusY: 1}
  ];
  await cdp.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: fingers(40)});
  for (let distance = 45; distance <= 80; distance += 5) {
    await cdp.send('Input.dispatchTouchEvent', {type: 'touchMove', touchPoints: fingers(distance)});
    await page.waitForTimeout(40);
  }
  await cdp.send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []});
  await page.waitForFunction(() => visualViewport.scale > 1.1);
  assert.equal(await page.locator('.board-tile').count(), 144);
  await cdp.send('Emulation.setPageScaleFactor', {pageScaleFactor: 1});
  await cdp.detach();

  await page.setViewportSize({width: 844, height: 390});
  await page.waitForTimeout(150); // Let the debounced resize handler run.
  await settle();
  assert.deepEqual(await identity(), original, 'Rotating retains tile identities and free-side geometry');
  await page.setViewportSize({width: 390, height: 844});
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('[data-act="board-focus"]').getAttribute('aria-pressed'), 'false');
  await checkBounds();

  // Existing wider layouts still fit, and their lower rows remain reachable.
  for (const layout of ['pyramid', 'garden', 'bridge', 'portrait']) {
    await page.locator(`[data-layout="${layout}"]`).tap();
    await checkBounds();
    assert.ok(await page.locator('.board-scroller').evaluate(scroller => scroller.clientHeight >= scroller.querySelector('.solitaire-stage').clientHeight), 'The fitted board is not vertically clipped');
  }
  await page.locator('[data-act="shuffle"]').tap();
  assert.equal(await page.locator('.board-tile').count(), 144);
  await page.locator('[data-act="hint"]').tap();
  assert.equal(await page.locator('.board-tile.is-hint').count(), 2);
  await page.locator('[data-act="new-sol"]').tap();
  assert.equal(await page.locator('.board-tile').count(), 144);
  assert.equal(await page.locator('[data-act="undo"]').isDisabled(), true);
  await page.setViewportSize({width: 1280, height: 900});
  await page.reload();
  assert.equal(await page.locator('[data-layout="pyramid"]').getAttribute('aria-pressed'), 'true', 'Desktop retains Pyramid by default');
}, {viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true})
  .catch(error => { console.error(error); process.exitCode = 1; });
