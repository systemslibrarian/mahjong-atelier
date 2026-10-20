'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
for(const name of ['core','table','hongkong','american','coach'])require('../js/'+name+'.js');
const M=globalThis.Mahjong;
const hand=s=>s.split(' ').map(M.core.makeTile);

test('coach does not promise a later self-draw after the last wall tile',()=>{
 const g=new M.HongKongTable({hkProfile:'atelier',flowers:false});
 g.players[0].hand=hand('b1 b2 d4 d5 d6 c7 c8 c9 dr dr dr we we wn');
 g.phase='discard';g.current=0;g.lastSource='draw';g.discardCount=4;
 const before=M.coach.alternatives(M.coach.publicView(g,0)).find(a=>a.type==='wn');
 assert.ok(before.waits.some(w=>w.type==='b3'));
 g.wall=[];
 const after=M.coach.alternatives(M.coach.publicView(g,0));
 assert.ok(after.length>0);
 for(const option of after){assert.deepEqual(option.waits,[]);assert.equal(option.unseenWinning,0);assert.match(option.calculation,/wall is empty/);assert.doesNotMatch(option.calculation,/could complete/);}
});

test('empty-wall coaching still permits a current winning hand and last-discard claims',()=>{
 const g=new M.HongKongTable({hkProfile:'atelier',flowers:false,minFan:3});
 g.phase='discard';g.current=0;g.wall=[];g.lastSource='draw';g.discardCount=4;g.interrupted=true;
 g.players[0].hand=hand('b1 b2 b3 d4 d5 d6 c7 c8 c9 dr dr dr we we');
 assert.ok(g.canDeclareWin(0),'self-draw + Dragon + last-wall reaches three faan');
 assert.equal(M.coach.alternatives(M.coach.publicView(g,0)).some(a=>a.waits.length),false);
 g.minFan=0;g.players[1].hand=hand('b1 b2 d4 d5 d6 c7 c8 c9 dr dr dr we we');g.players[2].hand=[];g.players[3].hand=[];
 g.discard(0,g.players[0].hand.find(t=>t.type==='b3').id);
 assert.equal(g.phase,'claims');assert.ok(g.offered().options.some(o=>o.kind==='win'));
 g.submitClaim(1,'win');assert.equal(g.winner,1);assert.ok(g.result.analysis.details.includes('Last discard +1'));
});

test('empty-wall American advice never offers a claim on a discarded Joker',()=>{
 const g=new M.AmericanTable();g.phase='discard';g.current=0;g.lastSource='draw';g.wall=[];
 g.players[0].hand=hand('b1 b1 b1 d2 d2 d2 c3 c3 c3 dr dr dr we j');
 const option=M.coach.alternatives(M.coach.publicView(g,0)).find(a=>a.type==='j');
 assert.match(option.calculation,/discarded Joker cannot be claimed/);
 assert.deepEqual(g.claimOptions(1,g.players[0].hand.find(t=>t.type==='j')),[]);
});
