'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
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
  for(const layout of ['pyramid','garden','bridge']){
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
test('tables conserve tiles and American begins with Charleston',()=>{
  const hk=new M.HongKongTable(), us=new M.AmericanTable();
  assert.equal(hk.integrity(),136);assert.equal(us.integrity(),152);
  assert.equal(hk.players.length,4);assert.equal(us.players.length,4);
  assert.equal(us.phase,'charleston');
});
