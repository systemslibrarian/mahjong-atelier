'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
for(const n of ['core','table','american'])require('../js/'+n+'.js');
const M=globalThis.Mahjong,H=s=>s.split(' ').filter(Boolean).map(M.core.makeTile);
const row=id=>M.americanTest.CARD.find(c=>c.id===id);
function table(){const g=new M.AmericanTable({opponents:'local'});g.phase='discard';g.lastSource='draw';return g;}

// AMJA Jokers and Joker Exchange: a called exposure retains a natural tile;
// an all-Joker group is allowed only inside the concealed part of a winning rack.
test('American validator rejects an all-Joker exposure even if its identity is Joker',()=>{
 const hand=H('b2 b2 b2 c3 c3 c3 dr dr dr we we');
 assert.equal(M.americanTest.matchPattern(hand,[{kind:'pung',type:'j',tiles:H('j j j')}],row('four')),false);
 assert.equal(table().exposureFits([{kind:'pung',type:'j',tiles:H('j j j')}]),false);
 assert.equal(M.americanTest.matchPattern([...hand,...H('j j j')],[],row('four')),true);
});
test('original non-Flower rows reject Flower exposures and malformed group identity',()=>{
 const hand=H('b2 b2 b2 c3 c3 c3 dr dr dr we we');
 for(const meld of [
  {kind:'pung',type:'f1',tiles:H('f1 j j')},
  {kind:'pung',type:'b1',tiles:H('b1 b2 j')},
  {kind:'pung',type:'b1',tiles:H('b1 b1 j'),concealed:true}
 ]){
  assert.equal(M.americanTest.matchPattern(hand,[meld],row('four')),false);
  assert.equal(table().exposureFits([meld]),false);
 }
 assert.equal(table().exposureFits([{type:'b1',tiles:H('b1 j j')}]),true);
});
test('American bot declares its completed rack before a Joker exchange can break the natural pair',()=>{
 const g=table();g.players[0].bot=true;
 g.players[0].hand=H('b1 b1 b1 d2 d2 d2 c3 c3 c3 dr dr dr we we');
 g.players[1].melds=[{kind:'pung',type:'we',tiles:H('we we j')}];
 assert.ok(g.canDeclareWin(0));assert.equal(g.botStep(),true);
 assert.equal(g.phase,'finished');assert.equal(g.winner,0);assert.equal(g.result.base,50);
 assert.deepEqual(g.result.payments,[300,-100,-100,-100]);
 assert.equal(g.players[1].melds[0].tiles.filter(t=>t.type==='j').length,1);
});

// Independent original-card examples: expected shapes and values are literal,
// not derived from CARD.groups or a second invocation of the matcher.
for(const f of [
 {id:'four',hand:'b1 b1 b1 d2 d2 d2 c3 c3 c3 dr dr dr we we',value:25,jokerFree:true},
 {id:'towers',hand:'b1 b1 b1 b1 d2 d2 d2 d2 c3 c3 c3 c3 we we',value:30,jokerFree:true},
 {id:'parade',hand:'b1 b1 b1 b1 j d2 d2 d2 d2 c3 c3 c3 we we',value:35,jokerFree:false},
 {id:'twins',hand:'b1 b1 b1 b1 j d2 d2 d2 d2 j c3 c3 we we',value:40,jokerFree:false},
 {id:'grand',hand:'b1 b1 b1 b1 j j d2 d2 d2 c3 c3 c3 we we',value:40,jokerFree:false},
 {id:'blooms',hand:'f1 f8 b1 b1 b1 d2 d2 d2 c3 c3 c3 c3 we we',value:30,jokerFree:true}
])test('American original row fixture: '+f.id,()=>{
 const g=table();g.players[0].hand=H(f.hand);
 assert.ok(M.americanTest.matchPattern(g.players[0].hand,[],row(f.id)));
 const a=g.winAnalysis(0);assert.equal(a.card.value,f.value);assert.equal(a.jokerFree,f.jokerFree);
 assert.equal(g.declareWin(0).base,f.value*(f.jokerFree?2:1));
});
test('natural Pairs and Bloom singles cannot be replaced with Jokers',()=>{
 assert.equal(M.americanTest.matchPattern(H('b1 b1 b1 d2 d2 d2 c3 c3 c3 dr dr dr we j'),[],row('four')),false);
 assert.equal(M.americanTest.matchPattern(H('f1 j b1 b1 b1 d2 d2 d2 c3 c3 c3 c3 we we'),[],row('blooms')),false);
 assert.equal(M.americanTest.matchPattern(H('j j j j j j d2 d2 d2 c3 c3 c3 we we'),[],row('grand')),true);
});
test('a concealed original row may win on a discard, including a completed natural Pair',()=>{
 const g=table();g.players[1].hand=H('b1 b1 b1 b1 j d2 d2 d2 d2 j c3 c3 we');
 const tile=M.core.makeTile('we');
 assert.equal(g.winAnalysis(1,tile).card.id,'twins');
 assert.ok(g.claimOptions(1,tile).some(o=>o.kind==='win'));
 const exposure={type:'b1',kind:'quint',tiles:g.players[1].hand.slice(0,5)};
 assert.equal(M.americanTest.matchPattern([...g.players[1].hand.slice(5),tile],[exposure],row('twins')),false);
});
test('American winning claim defeats a nearer exposure claim',()=>{
 const g=table();g.players[0].hand=H('b1');g.players[1].hand=H('b1 j c1 c2 c4 c5 c6 c7 c8 c9 d1 d3 d4');
 g.players[2].hand=H('b1 b1 d2 d2 d2 c3 c3 c3 dr dr dr we we');g.players[3].hand=[];
 const wall=g.wall.length;g.discard(0,g.players[0].hand[0].id);g.submitClaim(1,'set-3');g.submitClaim(2,'win');
 assert.equal(g.winner,2);assert.equal(g.result.from,0);assert.equal(g.result.selfDraw,false);
 assert.deepEqual(g.result.payments,[-100,-50,200,-50]);assert.equal(g.wall.length,wall);
});
test('American competing exposures use turn order, not group size, and take no extra draw',()=>{
 const g=table();g.players[0].hand=H('b1');g.players[1].hand=H('b1 j c1 c2 c4 c5 c6 c7 c8 c9 d1 d3 d4');
 g.players[2].hand=H('b1 j j b2 b3 b4 b5 b6 b7 b8 b9 d4 d5');g.players[3].hand=[];
 const wall=g.wall.length;g.discard(0,g.players[0].hand[0].id);g.submitClaim(1,'set-3');g.submitClaim(2,'set-4');
 assert.equal(g.current,1);assert.equal(g.players[1].melds[0].kind,'pung');assert.equal(g.players[2].melds.length,0);
 assert.equal(g.phase,'discard');assert.equal(g.lastSource,'claim');assert.equal(g.wall.length,wall);
 assert.equal(g.players[1].hand.length+g.players[1].melds[0].tiles.length,14);
});
test('each Charleston packet follows Right Across Left then Left Across Right',()=>{
 const g=new M.AmericanTable({opponents:'local'});g.phase='charleston';
 for(const [index,offset]of [1,2,3,3,2,1].entries()){
  const before=g.players.map(p=>p.hand.length);
  const packets=g.players.map(p=>p.hand.filter(t=>t.type!=='j').slice(0,3).map(t=>t.id));
  for(let seat=0;seat<4;seat++)g.submitPass(seat,packets[seat]);
  for(let seat=0;seat<4;seat++)assert.ok(packets[seat].every(id=>g.players[(seat+offset)%4].hand.some(t=>t.id===id)));
  assert.deepEqual(g.players.map(p=>p.hand.length),before);
  if(index===2){if(g.phase==='passingWin')g.continuePassing();for(let seat=0;seat<4;seat++)g.chooseSecond(seat,true);}
 }
 assert.ok(['courtesyChoice','passingWin'].includes(g.phase));
});
test('Bloom accepts either bonus family but a discarded Flower cannot create an exposure',()=>{
 const g=table();g.players[0].hand=H('f2 b1 b1 b1 d2 d2 d2 c3 c3 c3 c3 we we');
 const options=g.claimOptions(0,M.core.makeTile('f7'));
 assert.deepEqual(options.map(o=>o.kind),['win']);
 assert.deepEqual(g.claimOptions(0,M.core.makeTile('j')),[]);
});
test('Joker redemption can complete a win with self-picked payment and no extra wall draw',()=>{
 const g=table();g.players[0].hand=H('b1 b1 d2 d2 d2 c3 c3 c3 dr dr dr we we d9');
 g.players[1].melds=[{type:'d9',kind:'pung',tiles:H('d9 d9 j')}];
 const wall=g.wall.length;assert.equal(g.canDeclareWin(0),null);g.exchangeJoker(0,1,0);
 const r=g.declareWin(0);assert.equal(r.selfDraw,true);assert.equal(r.base,25);assert.equal(r.from,null);
 assert.deepEqual(r.payments,[150,-50,-50,-50]);assert.equal(g.wall.length,wall);
});
test('Joker redemption rejects a malformed all-Joker exposure atomically',()=>{
 const g=table();g.players[0].hand=H('j b1');g.players[1].melds=[{type:'j',kind:'pung',tiles:H('j j j')}];
 const before=JSON.stringify(g.players);assert.throws(()=>g.exchangeJoker(0,1,0),/No Joker/);assert.equal(JSON.stringify(g.players),before);
});
