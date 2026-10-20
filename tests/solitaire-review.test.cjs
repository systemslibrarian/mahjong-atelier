'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
for(const name of ['core','solitaire','table','hongkong','american','coach','practice'])require('../js/'+name+'.js');
const M=globalThis.Mahjong;
const tile=(id,x,y,z,type,removed=false)=>({id,x,y,z,tile:M.core.makeTile(type),removed});
function board(tiles){const g=new M.Solitaire();g.tiles=tiles;return g;}

// Rule examples are literal fixtures: identical faces, distinct Flower/Season
// families, and an uncovered tile with at least one open horizontal side.
// Reference: https://docs.kde.org/stable_kf6/en/kmahjongg/kmahjongg/rules.html
test('Solitaire needs a horizontal opening and no tile above, not vertical clearance',()=>{
 const g=board([
  tile('target',1,1,0,'d5'),tile('left',0,1,0,'d1'),tile('right',2,1,0,'d2'),
  tile('front',1,2,0,'d3'),tile('back',1,0,0,'d4'),tile('above',1,1,2,'d6')
 ]);
 assert.equal(g.choose('target').action,'locked');
 g.tiles.find(t=>t.id==='above').removed=true;
 assert.equal(g.freeId('target'),false,'Two horizontal neighbors still block it');
 g.tiles.find(t=>t.id==='left').removed=true;
 assert.equal(g.freeId('target'),true,'Vertical neighbors do not close the open left side');
 g.tiles.find(t=>t.id==='above').removed=false;
 assert.equal(g.freeId('target'),false,'Any occupied higher layer directly above covers it');
});

test('Solitaire matching keeps Flower and Season families separate and honors exact',()=>{
 for(const [a,b,matching] of [
  ['f1','f4',true],['f5','f8',true],['f1','f5',false],
  ['b2','d2',false],['we','ws',false],['dr','dg',false],['dw','dw',true]
 ]){
  const g=board([tile('a',0,0,0,a),tile('b',2,0,0,b)]);
  assert.equal(g.choose('a').action,'select');
  assert.equal(g.choose('b').action,matching?'match':'nomatch',a+' / '+b);
  assert.equal(g.remaining,matching?0:2);
 }
});

test('A matching face under its partner cannot be removed as a pair',()=>{
 const g=board([tile('lower',0,0,0,'b1'),tile('upper',0,0,1,'b1')]);
 assert.deepEqual(g.pairs(),[]);
 assert.equal(g.choose('upper').action,'select');
 assert.equal(g.choose('lower').action,'locked');
 assert.equal(g.remaining,2);
});

test('Rescuing a trapped stack preserves each remaining tile and clears old undo history',()=>{
 const g=board([
  tile('lower',0,0,0,'b1'),tile('upper',0,0,1,'b1'),
  tile('old-a',2,0,0,'c1',true),tile('old-b',3,0,0,'c1',true)
 ]);
 g.undoStack=[['old-a','old-b']];g.moves=1;
 const ids=g.tiles.filter(t=>!t.removed).map(t=>t.tile.id).sort((a,b)=>a-b);
 assert.equal(g.reshuffle(),true);
 assert.equal(g.reflowed,true);
 assert.equal(g.undo(),false,'Tiles removed before a shuffle must stay removed');
 assert.deepEqual(g.tiles.filter(t=>!t.removed).map(t=>t.tile.id).sort((a,b)=>a-b),ids);
 assert.equal(g.tiles.filter(t=>t.removed).length,2);
 assert.equal(g.available().length,2);
 assert.equal(g.pairs().length,1);
 const pair=g.pairs()[0];g.choose(pair[0]);g.choose(pair[1]);
 assert.equal(g.finished,true);assert.equal(g.remaining,0);
 assert.equal(g.undo(),true);assert.equal(g.finished,false);assert.equal(g.remaining,2);
 assert.deepEqual(g.tiles.filter(t=>!t.removed).map(t=>t.tile.id).sort((a,b)=>a-b),ids);
});

test('Undo restores the completed pair and selection without changing its identities',()=>{
 const g=board([tile('a',0,0,0,'f2'),tile('b',2,0,0,'f4')]);
 const before=g.tiles.map(t=>({...t,tile:{...t.tile}}));
 g.choose('a');g.choose('b');assert.equal(g.finished,true);
 assert.equal(g.choose('a').action,'locked');
 assert.equal(g.undo(),true);
 assert.equal(g.moves,0);assert.equal(g.selected,null);assert.equal(g.finished,false);
 assert.deepEqual(g.tiles,before);
});

test('Solitaire practice discards comparisons whose board changed after a match',()=>{
 const p=new M.Practice('solitaire');p.compare();
 assert.ok(p.comparisons.some(c=>c.ids.includes('c')&&c.ids.includes('d')));
 p.pick('c');assert.ok(p.comparisons.length,'Selecting alone does not change the board');
 p.pick('d');assert.equal(p.comparisons.length,0,'Removed Bamboo tiles are no longer recommendations');
 p.compare();
 assert.ok(p.comparisons.length);
 assert.ok(p.comparisons.every(c=>c.ids.every(id=>p.tiles().some(t=>t.id===id))));
 assert.ok(p.comparisons.every(c=>!c.ids.includes('c')&&!c.ids.includes('d')));
 assert.ok(p.comparisons.every(c=>c.newly.length===0),'The remaining isolated pairs uncover nothing');
});
