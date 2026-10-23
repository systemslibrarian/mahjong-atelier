'use strict';
const assert=require('node:assert/strict');
const {runBrowserCheck}=require('./browser-support.cjs');
runBrowserCheck('browser-flows',async({page,target,artifactPath})=>{
 await page.goto(target);
 // Every rules strip must describe the actual selected or running profile.
 await page.locator('[data-act="switch"][data-mode="hongkong"]').click();
 await page.locator('[data-setting="minFan"]').selectOption('3');
 await page.locator('[data-setting="flowers"]').check();
 await page.locator('[data-setting="sevenPairs"]').check();
 assert.match(await page.locator('[data-rules-state="setup"] [data-rule="minimum"]').innerText(),/3 qualifying faan/);
 await page.locator('[data-setting="hkProfile"]').selectOption('beginner');
 assert.match(await page.locator('[data-rules-profile="beginner"] [data-rule="flowers"]').innerText(),/Off/);
 assert.match(await page.locator('[data-rules-profile="beginner"] [data-rule="seven-pairs"]').innerText(),/Off/);
 await page.locator('[data-act="start-table"]').click();
 assert.match(await page.locator('[data-rules-state="active"]').innerText(),/Hong Kong Beginner/);
 assert.match(await page.locator('[data-rules-state="active"] [data-rule="minimum"]').innerText(),/3 qualifying faan/);
 // An intentionally different game configuration proves the active strip does
 // not merely repeat the setup state (which remains Beginner / zero minimum).
 await page.reload();
 await page.evaluate(()=>{const Base=Mahjong.HongKongTable;Mahjong.HongKongTable=class extends Base{constructor(settings){super({...settings,hkProfile:'atelier',minFan:3,flowers:true,sevenPairs:true});}};});
 await page.locator('[data-act="switch"][data-mode="hongkong"]').click();
 await page.locator('[data-setting="hkProfile"]').selectOption('beginner');
 await page.locator('[data-act="start-table"]').click();
 assert.match(await page.locator('[data-rules-state="active"]').innerText(),/Atelier Hong Kong v2/);
 assert.match(await page.locator('[data-rules-state="active"] [data-rule="minimum"]').innerText(),/3 qualifying faan/);
 assert.match(await page.locator('[data-rules-state="active"] [data-rule="flowers"]').innerText(),/On/);
 assert.match(await page.locator('[data-rules-state="active"] [data-rule="seven-pairs"]').innerText(),/On/);
 await page.setViewportSize({width:390,height:844});
 assert.ok(await page.locator('.rules-profile').evaluate(e=>e.scrollWidth<=e.clientWidth));
 await page.screenshot({path:artifactPath('active-rules-mobile.png')});
 await page.locator('[data-act="switch"][data-mode="solitaire"]').click();
 await page.evaluate(()=>new Promise(requestAnimationFrame));
 assert.ok(await page.locator('.solitaire-stage').evaluate((stage)=>{
  const scroller=stage.closest('.board-scroller');
  return stage.getBoundingClientRect().width<=scroller.getBoundingClientRect().width+1;
 }));
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.screenshot({path:artifactPath('solitaire-mobile-fit.png')});
 await page.setViewportSize({width:1280,height:900});
 await page.reload();
 await page.locator('[data-act="switch"][data-mode="american"]').click();
 assert.match(await page.locator('[data-rules-state="setup"] [data-rule="card"]').innerText(),/6 patterns/);
 await page.locator('[data-act="start-table"]').click();
 assert.match(await page.locator('[data-rules-state="active"]').innerText(),/American Practice v2/);
 assert.match(await page.locator('[data-rules-state="active"]').innerText(),/Official annual-card hands are not included/);
 await page.reload();
 for(const mode of ['solitaire','hongkong','american']){
  await page.locator(`[data-act="switch"][data-mode="${mode}"]`).click();await page.locator('[data-act="path"]').click();
  const answers=await page.evaluate(mode=>Mahjong.learningPath.steps(mode).map(s=>s.answer),mode);
  for(let i=0;i<answers.length;i++){
   await page.locator(`[data-stage="${i}"]`).first().click();
   const wrong=(answers[i]+1)%await page.locator('[data-option]').count();await page.locator(`[data-option="${wrong}"]`).click();assert.match(await page.locator('.lesson-feedback').innerText(),/Try another/);
   await page.locator(`[data-option="${answers[i]}"]`).click();assert.match(await page.locator('.lesson-feedback').innerText(),/That’s right/);
   await page.locator('.lesson-pager [data-stage]').click();
  }
  for(const variant of ['solitaire','hongkong','american'])await page.locator(`[data-variant="${variant}"]`).click();
  await page.locator('[data-compare="3"]').click();assert.ok((await page.locator('.compare-explanation').innerText()).length>50);
  await page.locator('[data-path="practice"]').click();await page.locator('[data-do="hint"]').click();await page.locator('[data-do="compare"]').click();assert.ok(await page.locator('[data-comparison]').count()>=2);
  if(mode==='solitaire'){
   for(const id of ['c','d'])await page.locator(`[data-pick="${id}"]`).click();await page.locator('[data-do="retry"]').click();assert.equal(await page.locator('[data-pick]').count(),6);
   for(const id of ['c','d','a','b','e','f'])await page.locator(`[data-pick="${id}"]`).click();await page.locator('[data-do="next"]').click();
  }else{
   await page.locator('[data-comparison="0"]').click();await page.locator('[data-do="act"]').click();await page.locator('[data-do="next"]').click();
   await page.locator('[data-do="retry"]').click();
   for(let i=0;i<2;i++){await page.locator('[data-do="act"]').click();await page.locator('[data-do="next"]').click();}
  }
  assert.match(await page.locator('#practice-title').innerText(),/practiced/);await page.locator('[data-do="close"]').click();
 }
 await page.reload();assert.equal(await page.evaluate(()=>Mahjong.learningProgress.get('path-american').done.filter(x=>x!=='comparison').length),await page.evaluate(()=>Mahjong.learningPath.steps('american').length));
 await page.locator('[data-act="switch"][data-mode="hongkong"]').click();await page.locator('[data-act="start-table"]').click();await page.locator('[data-act="coach-hint"]').click();assert.ok(await page.locator('[data-act="coach-select"]').count()>0);await page.locator('[data-act="coach-select"]').first().click();await page.locator('[data-act="discard"]').click();assert.match(await page.locator('.coach-review').innerText(),/After your move/);
 await page.locator('[data-teaching]').uncheck();assert.equal(await page.locator('.coach-boundary').count(),0);
 await page.locator('[data-act="switch"][data-mode="american"]').click();await page.locator('[data-act="start-table"]').click();await page.locator('[data-act="begin-charleston"]').click();
 for(let pass=0;pass<3;pass++){
  await page.locator('[data-act="hand-pick"]:enabled').first().waitFor();
  if(pass===2)await page.locator('[data-blind]').selectOption('1');
  const count=pass===2?2:3;
  for(let i=0;i<count;i++)await page.locator('[data-act="hand-pick"]:not(.is-selected):not([aria-label*="Joker"])').first().click();
  await page.locator('[data-act="submit-pass"]:enabled').click();
 }
 await page.locator('[data-act="second-no"]:enabled').click();await page.locator('[data-act="courtesy-offer"][data-count="0"]:enabled').click();await page.locator('[data-act="submit-pass"]:enabled').click();await page.locator('[data-act="discard"]').waitFor();
 // Targeted fixtures drive real controls; no production debug hooks are needed.
 await page.reload();await page.evaluate(()=>{const Base=Mahjong.AmericanTable;Mahjong.AmericanTable=class extends Base{constructor(s){super(s);this.players[0].hand='b1 b1 b1 d2 d2 d2 c3 c3 c3 dr dr dr we we'.split(' ').map(Mahjong.core.makeTile);}};});
 await page.locator('[data-act="switch"][data-mode="american"]').click();await page.locator('[data-act="start-table"]').click();assert.equal(await page.locator('[data-act="begin-charleston"]').isDisabled(),true);await page.locator('[data-act="win"]').click();assert.match(await page.locator('.result-banner').innerText(),/self-draw/);
 await page.reload();await page.evaluate(()=>{const Base=Mahjong.AmericanTable;Mahjong.AmericanTable=class extends Base{constructor(s){super(s);const H=x=>x.split(' ').map(Mahjong.core.makeTile);this.phase='discard';this.current=3;this.players[0].hand=H('b1 b1 j d2 d2 c3 c3 c3 dr dr we we c9');this.players[1].hand=[];this.players[2].hand=[];this.players[2].melds=[{kind:'pung',type:'c9',tiles:H('c9 c9 j')}];this.players[3].hand=H('b1');this.discard(3,this.players[3].hand[0].id);}};});
 await page.locator('[data-act="switch"][data-mode="american"]').click();await page.locator('[data-act="start-table"]').click();await page.locator('[data-act="claim"][data-code="set-3"]').click();assert.equal(await page.locator('.seat-0 .public-tile').count(),3);await page.locator('[data-teaching]').check();await page.locator('[data-act="coach-hint"]').click();await page.locator('.exposure-adjust summary').click();await page.locator('[data-act="adjust-exposure"]').filter({hasText:'4 tiles'}).first().click();assert.equal(await page.locator('.seat-0 .public-tile').count(),4);assert.match(await page.locator('.seat-0 .meld-composition').innerText(),/3 natural.*1 Joker/);assert.equal(await page.locator('.seat-0 .public-tile[aria-label="Joker"]').count(),1);assert.equal(await page.locator('.coach-boundary').count(),0);await page.locator('[data-act="coach-hint"]').click();await page.locator('[data-act="joker-swap"][data-seat="2"]').click();assert.equal(await page.locator('.exposure-adjust').count(),0);assert.equal(await page.locator('.coach-boundary').count(),0);assert.match(await page.locator('.coach-review').innerText(),/redeemed Joker/);
 await page.reload();await page.evaluate(()=>{const Base=Mahjong.HongKongTable;Mahjong.HongKongTable=class extends Base{constructor(s){super({...s,flowers:false});const H=x=>x.split(' ').map(Mahjong.core.makeTile);this.lastSource='draw';this.discardCount=5;this.players[0].hand=H('b1 b1 b1 b1 d2 d3 d4 c5 c6 c7 dr dr we ws');this.players[1].melds=[{kind:'kong',type:'ww',concealed:true,tiles:H('ww ww ww ww')}];this.players[2].melds=[{kind:'chow',type:'c4',tiles:H('c4 c5 c6')}];this.players[2].flowers=H('f1 f6');}};});
 await page.locator('[data-act="switch"][data-mode="hongkong"]').click();await page.locator('[data-act="start-table"]').click();assert.match(await page.locator('.seat-1 .exposed-meld').innerText(),/face-down/);assert.equal(await page.locator('.seat-1 .exposed-meld').getAttribute('title'),null);assert.equal(await page.locator('.seat-1 .public-tile').count(),0);assert.deepEqual(await page.locator('.seat-2 .exposed-meld .public-tile').evaluateAll(ts=>ts.map(t=>t.getAttribute('aria-label'))),['4 Characters','5 Characters','6 Characters']);assert.equal(await page.locator('.seat-2 .seat-flowers .public-tile').count(),2);await page.locator('[data-act="coach-hint"]').click();await page.locator('[data-act="kong"][data-type="b1"]').click();assert.equal(await page.locator('.coach-boundary').count(),0);assert.equal(await page.locator('.seat-0 .public-tile').count(),4);await page.setViewportSize({width:390,height:844});await page.evaluate(()=>new Promise(requestAnimationFrame));await page.screenshot({path:artifactPath('exposed-tiles.png')});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.setViewportSize({width:1280,height:900});
 await page.reload();await page.evaluate(()=>{const Base=Mahjong.HongKongTable;Mahjong.HongKongTable=class extends Base{constructor(s){super({...s,flowers:false});const H=x=>x.split(' ').map(Mahjong.core.makeTile);this.lastSource='draw';this.discardCount=5;this.current=1;this.players[1].hand=H('b1 b2 b3 d4 d5 d6 c7 c8 c9 dr dr');this.players[1].melds=[{kind:'kong',type:'we',concealed:true,tiles:H('we we we we')}];this.declareWin(1);}};});
 await page.locator('[data-act="switch"][data-mode="hongkong"]').click();await page.locator('[data-act="start-table"]').click();assert.equal(await page.locator('.rack .mj-tile').count(),11);assert.match(await page.locator('.seat-1 .exposed-meld').innerText(),/East wind/);
 // Local handoff hides private faces and private analysis before the next reveal.
 await page.reload();await page.evaluate(()=>{const Base=Mahjong.HongKongTable;Mahjong.HongKongTable=class extends Base{constructor(s){super({...s,flowers:false});const H=x=>x.split(' ').map(Mahjong.core.makeTile);this.current=1;this.lastSource='draw';this.discardCount=5;this.players[1].hand=H('b1 b2 d3 d4 d5 c6 c7 c8 dr we ws');this.players[1].melds=[{kind:'kong',type:'wn',concealed:true,tiles:H('wn wn wn wn')}];this.players[2].hand=H('c1');this.players[3].hand=H('c2');this.players[0].hand=H('c3');}};});
 await page.locator('[data-act="switch"][data-mode="hongkong"]').click();await page.locator('[data-act="opponents"][data-value="local"]').click();await page.locator('[data-act="start-table"]').click();
 assert.equal(await page.locator('.shell').getAttribute('aria-hidden'),'true');assert.ok(await page.locator('.shell').evaluate(e=>e.inert));assert.equal(await page.locator('.rack .mj-tile').count(),0);assert.equal(await page.locator('.seat-1 .public-tile').count(),0);assert.equal(await page.evaluate(()=>document.activeElement.dataset.act),'reveal');
 await page.locator('[data-act="reveal"]').click();assert.equal(await page.locator('.shell').getAttribute('aria-hidden'),null);assert.equal(await page.locator('.rack .mj-tile').count(),11);assert.equal(await page.locator('.seat-1 .public-tile').count(),4);
 await page.locator('[data-act="coach-hint"]').click();await page.locator('[data-act="hand-pick"][aria-label^="Red dragon"]').click();await page.locator('[data-act="discard"]').click();assert.equal(await page.locator('.curtain').count(),1);assert.equal(await page.locator('.rack .mj-tile').count(),0);assert.equal(await page.locator('.seat-1 .public-tile').count(),0);assert.equal(await page.locator('.coach-review').count(),0);assert.equal(await page.locator('.coach-boundary').count(),0);await page.locator('[data-act="reveal"]').click();
 await page.setViewportSize({width:390,height:844});await page.locator('[data-act="path"]').click();await page.locator('[data-stage="0"]').first().click();
 await page.locator('[data-option]').first().focus();await page.keyboard.press('Enter');assert.ok((await page.locator('.lesson-feedback').innerText()).length>20);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.ok(await page.locator('dialog').evaluate(d=>d.scrollWidth<=d.clientWidth+1));
 await page.screenshot({path:process.env.ATELIER_SCREENSHOT||artifactPath('mobile.png')});await page.keyboard.press('Escape');await page.locator('dialog').waitFor({state:'detached'});assert.equal(await page.locator('dialog').count(),0);
 console.log('Verified learning paths, comparisons, practice, progress, live coach, passing, opening wins, exposure adjustments, Joker/Kong advice refresh, exposed tile composition, public bonus tiles, concealed/revealed Kongs, private local handoffs, mobile, keyboard answers, and Escape.');
}).catch(e=>{console.error(e);process.exitCode=1;});
