'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE,args:['--no-sandbox','--no-zygote','--single-process','--disable-gpu','--disable-software-rasterizer','--disable-gpu-compositing','--use-gl=disabled']}:{headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const target=process.env.ATELIER_URL||'file://'+path.resolve(__dirname,'../index.html');await page.goto(target);
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
 await page.reload();assert.equal(await page.evaluate(()=>Mahjong.learningProgress.get('path-american').done.filter(x=>x!=='comparison').length),6);
 await page.locator('[data-act="switch"][data-mode="hongkong"]').click();await page.locator('[data-act="start-table"]').click();await page.locator('[data-act="coach-hint"]').click();assert.ok(await page.locator('[data-act="coach-select"]').count()>0);await page.locator('[data-act="coach-select"]').first().click();await page.locator('[data-act="discard"]').click();assert.match(await page.locator('.coach-review').innerText(),/After your move/);
 await page.locator('[data-teaching]').uncheck();assert.equal(await page.locator('.coach-boundary').count(),0);
 await page.locator('[data-act="switch"][data-mode="american"]').click();await page.locator('[data-act="start-table"]').click();
 for(let pass=0;pass<3;pass++){
  await page.locator('[data-act="hand-pick"]:enabled').first().waitFor();
  if(pass===2)await page.locator('[data-blind]').selectOption('1');
  const count=pass===2?2:3;
  for(let i=0;i<count;i++)await page.locator('[data-act="hand-pick"]:not(.is-selected):not([aria-label*="Joker"])').first().click();
  await page.locator('[data-act="submit-pass"]:enabled').click();
 }
 await page.locator('[data-act="second-no"]:enabled').click();await page.locator('[data-act="courtesy-offer"][data-count="0"]:enabled').click();await page.locator('[data-act="submit-pass"]:enabled').click();await page.locator('[data-act="discard"]').waitFor();
 await page.setViewportSize({width:390,height:844});await page.locator('[data-act="path"]').click();await page.locator('[data-stage="0"]').first().click();
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.ok(await page.locator('dialog').evaluate(d=>d.scrollWidth<=d.clientWidth+1));
 await page.screenshot({path:process.env.ATELIER_SCREENSHOT||'/tmp/atelier-mobile.png'});await page.keyboard.press('Escape');await page.locator('dialog').waitFor({state:'detached'});assert.equal(await page.locator('dialog').count(),0);
 assert.deepEqual(errors,[]);await browser.close();console.log('Browser flows passed: all learning paths, comparisons, practice, progress, live coach, passing, mobile, Escape.');
})().catch(e=>{console.error(e);process.exit(1);});
