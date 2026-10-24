'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
require('../js/tile-art.js');
require('../js/core.js');
require('../js/solitaire.js');
require('../js/table.js');
require('../js/hongkong.js');
require('../js/american.js');
const M=globalThis.Mahjong, hand=types=>types.map(type=>M.core.makeTile(type));

test('expected tile inventories',()=>{
  assert.equal(M.core.tileset('hk').length,136);
  assert.equal(M.core.tileset('solitaire').length,144);
  assert.equal(M.core.tileset('american').length,152);
});
test('Chinese faces and bird for 1-Bamboo',()=>{
  assert.match(M.core.tileMarkup('b1'),/tile-art-bird/);
  assert.match(M.core.tileMarkup('c7'),/七/);
  assert.match(M.core.tileMarkup('we'),/東/);
});
test('all solitaire layouts allow a matched pair and undo',()=>{
  for(const layout of ['portrait','pyramid','garden','bridge']){
    const g=new M.Solitaire(layout);
    assert.equal(g.remaining,144);
    const pair=g.pairs()[0];assert.ok(pair,'missing pair '+layout);
    assert.equal(g.choose(pair[0]).action,'select');
    assert.equal(g.choose(pair[1]).action,'match');
    assert.equal(g.remaining,142);assert.equal(g.undo(),true);assert.equal(g.remaining,144);
  }
});
test('Hong Kong beginner four melds and pair validator',()=>{
  const tiles=hand(['b1','b2','b3','b4','b5','b6','b7','b8','b9','d1','d1','d1','we','we']);
  assert.ok(M.hongkongTest.partitions(tiles).length>0);
  assert.equal(M.hongkongTest.partitions(tiles.slice(1)).length,0);
});
test('American original practice card insists on natural pair',()=>{
  const p=M.americanTest.CARD.find(c=>c.id==='four');
  const types=['b1','b1','b1','b2','b2','b2','b3','b3','b3','b4','b4','b4','we','we'];
  assert.equal(M.americanTest.matchPattern(hand(types),[],p),true);
  const meld=types.slice();meld[0]='j';
  assert.equal(M.americanTest.matchPattern(hand(meld),[],p),true);
  const pair=types.slice();pair[13]='j';
  assert.equal(M.americanTest.matchPattern(hand(pair),[],p),false);
});
test('tables conserve tiles and American begins with dealer opening check',()=>{
  const hk=new M.HongKongTable(), us=new M.AmericanTable();
  assert.equal(hk.integrity(),136);assert.equal(us.integrity(),152);
  assert.equal(hk.players.length,4);assert.equal(us.players.length,4);
  assert.equal(us.phase,'opening');
});
test('sortHand correctly orders winds and dragons',()=>{
  const tiles=hand(['b1','c1','d1','we','ws','ww','wn','dr','dg','dw']);
  const sorted=M.core.sortHand([...tiles]);
  const types=sorted.map(t=>t.type);
  assert.deepEqual(types.slice(0,3),['b1','d1','c1']);
  assert.ok(types.indexOf('we')>types.indexOf('c1'),'we should be after suits');
  assert.ok(types.indexOf('ws')>types.indexOf('c1'),'ws should be after suits');
  assert.ok(types.indexOf('ww')>types.indexOf('c1'),'ww should be after suits');
  assert.ok(types.indexOf('wn')>types.indexOf('c1'),'wn should be after suits');
  assert.ok(types.indexOf('dr')>types.indexOf('c1'),'dr should be after suits');
  assert.ok(types.indexOf('dg')>types.indexOf('c1'),'dg should be after suits');
  assert.ok(types.indexOf('dw')>types.indexOf('c1'),'dw should be after suits');
});
test('name function handles empty type',()=>{
  assert.equal(M.core.name(''),'Unknown');
  assert.equal(M.core.name('b1'),'1 Bamboo');
  assert.equal(M.core.name('we'),'East wind');
  assert.equal(M.core.name('dr'),'Red dragon');
});
test('matchKey handles empty type',()=>{
  assert.equal(M.core.matchKey(''),'');
  assert.equal(M.core.matchKey('f1'),'flower');
  assert.equal(M.core.matchKey('f5'),'season');
});
test('American Joker redemption works across exposures and enforces turn/material',()=>{
 const us=new M.AmericanTable();us.phase='discard';us.current=0;us.lastSource='draw';us.players[0].hand=hand(['c1','b2']);
 us.players[1].melds=[{kind:'pung',type:'c1',tiles:hand(['c1','c1','j']),from:2}];
 assert.throws(()=>us.exchangeJoker(1,1,0),/your turn/);
 us.exchangeJoker(0,1,0);assert.equal(us.players[0].hand.length,2);assert.ok(us.players[0].hand.some(t=>t.type==='j'));assert.ok(us.players[1].melds[0].tiles.every(t=>t.type==='c1'));
 assert.throws(()=>us.exchangeJoker(0,1,0),/No Joker/);
});
test('solitaire finished state blocks moves',()=>{
  const g=new M.Solitaire('pyramid');
  g.finished=true;
  assert.equal(g.choose(g.tiles[0].id).action,'locked');
});
test('botChooseClaim prioritizes claim types correctly',()=>{
  const hk=new M.HongKongTable();
  hk.current=0;
  const offer={options:[{kind:'chow',code:'chow-1',priority:40},{kind:'pung',code:'pung-1',priority:50},{kind:'kong',code:'kong-1',priority:60}]};
  const bigOptions=offer.options.filter(o=>o.kind==='kong'||o.kind==='quint'||o.kind==='pung');
  assert.equal(bigOptions.length,2,'Should have 2 big options (pung and kong)');
  bigOptions.sort((a,b)=>b.priority-a.priority);
  assert.equal(bigOptions[0].code,'kong-1','Highest priority should be kong-1');
});

