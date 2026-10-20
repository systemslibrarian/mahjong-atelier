'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
for(const file of ['core','table','hongkong'])require('../js/'+file+'.js');
const M=globalThis.Mahjong,H=s=>s.split(' ').filter(Boolean).map(M.core.makeTile);
function table(settings={}){
 const g=new M.HongKongTable({hkProfile:'atelier',flowers:false,opponents:'local',...settings});
 g.players.forEach(p=>{p.hand=[];p.melds=[];p.flowers=[];p.discards=[];});
 g.wall=H('c1 c2 c3 c4 c5 c6');g.current=g.dealer;g.lastSource='draw';g.discardCount=4;g.interrupted=true;
 return g;
}
function ids(g){return [...g.wall,...g.players.flatMap(p=>[...p.hand,...p.flowers,...p.discards,...p.melds.flatMap(m=>m.tiles)])].map(t=>t.id).sort((a,b)=>a-b);}
function vote(g,wanted){while(g.phase==='claims'||g.phase==='robkong'){const o=g.offered();g.submitClaim(o.seat,wanted[o.seat]||'pass');}}

test('standard shape validation matches an independent meld catalogue for every one-suit 14-tile inventory',()=>{
 // Construct all legal shapes forward from a pair plus four members of a
 // literal meld catalogue. This is independent of the engine's recursive
 // remove-the-lowest-tile decomposition, and checks negative inventories too.
 const catalogue=[];
 for(let rank=0;rank<9;rank++){const a=Array(9).fill(0);a[rank]=3;catalogue.push(a);}
 for(let rank=0;rank<7;rank++){const a=Array(9).fill(0);a[rank]=a[rank+1]=a[rank+2]=1;catalogue.push(a);}
 const legal=new Set();
 function build(counts,first,left){
  if(!left){legal.add(counts.join(''));return;}
  for(let i=first;i<catalogue.length;i++){
   const next=counts.map((n,k)=>n+catalogue[i][k]);
   if(next.every(n=>n<=4))build(next,i,left-1);
  }
 }
 for(let pair=0;pair<9;pair++){const a=Array(9).fill(0);a[pair]=2;build(a,0,4);}
 let checked=0;
 function inspect(counts,left){
  if(counts.length===9){
   if(left)return;const tiles=counts.flatMap((n,i)=>Array.from({length:n},()=>M.core.makeTile('b'+(i+1))));
   const actual=M.hongkongTest.partitions(tiles).length>0;
   assert.equal(actual,legal.has(counts.join('')),'tile counts '+counts.join(','));checked++;return;
  }
  const slots=8-counts.length;
  for(let n=Math.max(0,left-4*slots);n<=Math.min(4,left);n++)inspect([...counts,n],left-n);
 }
 inspect([],14);assert.equal(checked,118800);assert.ok(legal.size>10000);
});

// H1, turn/claim sections: a later player's Pung beats the next player's Chow,
// and a non-Kong claim replaces the draw rather than adding another tile.
test('Hong Kong Pung defeats Chow and leaves the wall untouched',()=>{
 const g=table();g.players[0].hand=H('b3');g.players[1].hand=H('b1 b2 d1');g.players[2].hand=H('b3 b3 c9');
 const before=ids(g),wall=g.wall.map(t=>t.id);g.discard(0,g.players[0].hand[0].id);
 assert.ok(g.offered().options.some(o=>o.kind==='chow'));vote(g,{1:'chow-1',2:'pung'});
 assert.equal(g.current,2);assert.equal(g.phase,'discard');assert.deepEqual(g.wall.map(t=>t.id),wall);
 assert.equal(g.players[2].melds[0].kind,'pung');assert.deepEqual(g.players[1].hand.map(t=>t.type),['b1','b2','d1']);assert.deepEqual(ids(g),before);
});

test('a qualifying Hong Kong win defeats an exposed Kong with no replacement draw',()=>{
 const g=table();g.players[0].hand=H('b3');g.players[1].hand=H('b3 b3 b3 c9');g.players[2].hand=H('b1 b2 d4 d5 d6 c7 c8 c9 dr dr dr we we');
 const before=ids(g),wall=g.wall.length;g.discard(0,g.players[0].hand[0].id);vote(g,{1:'kong',2:'win'});
 assert.equal(g.winner,2);assert.equal(g.players[1].melds.length,0);assert.equal(g.wall.length,wall);assert.deepEqual(ids(g),before);
 assert.equal(g.result.selfDraw,false);assert.equal(g.result.from,0);assert.deepEqual(g.result.payments,[-4,-2,8,-2]);
});

test('equal ordinary winning claims follow turn order for every discarder position',()=>{
 for(let from=0;from<4;from++){
  const g=table();g.current=from;const near=(from+1)%4,far=(from+2)%4;
  g.players[from].hand=H('b3');
  g.players[near].hand=H('b1 b2 d4 d5 d6 c7 c8 c9 dr dr dr we we');
  g.players[far].hand=H('b4 b5 d1 d2 d3 c1 c2 c3 dg dg dg wn wn');
  g.discard(from,g.players[from].hand[0].id);vote(g,{[near]:'win',[far]:'win'});
  assert.equal(g.winner,near);assert.equal(g.result.from,from);
 }
});

// H1 Variant 1: East's Pung in the East round supplies two wind faan.
// An ordinary discard adds none; robbing an added Kong adds the third faan.
test('three-faan eligibility distinguishes an ordinary discard from robbing a Kong',()=>{
 const g=table({minFan:3});g.current=3;
 g.players[0].hand=H('b2 b3 d4 d5 d6 c7 c8 c9 we we we d7 d7');
 g.players[3].hand=H('b4 c1 c2 c3 d1 d2 d3 c5 c6 c7 dr');
 g.players[3].melds=[{kind:'pung',type:'b4',tiles:H('b4 b4 b4'),from:2}];
 assert.equal(g.winAnalysis(0,M.core.makeTile('b4'),false),null);
 const before=ids(g),wall=g.wall.length;g.declareKong(3,'add:b4');
 assert.equal(g.phase,'robkong');assert.equal(g.offered().seat,0);g.submitClaim(0,'win');
 assert.equal(g.result.analysis.fan,3);assert.deepEqual(g.result.payments,[32,-8,-8,-16]);
 assert.equal(g.players[3].melds[0].kind,'pung');assert.equal(g.wall.length,wall);assert.deepEqual(ids(g),before);
});

test('the initial East hand and East first discard award the appropriate fixed opening score',()=>{
 const heavenly=table();heavenly.interrupted=false;heavenly.discardCount=0;heavenly.lastSource='deal';
 heavenly.players[0].hand=H('b1 b2 b3 d4 d5 d6 c7 c8 c9 b7 b7 b7 d2 d2');
 const h=heavenly.declareWin(0);assert.equal(h.analysis.special,'Heavenly Hand');assert.equal(h.analysis.fan,10);assert.deepEqual(h.payments,[384,-128,-128,-128]);
 const earthly=table();earthly.interrupted=false;earthly.discardCount=0;earthly.lastSource='deal';
 earthly.players[0].hand=H('b3');earthly.players[1].hand=H('b1 b2 d4 d5 d6 c7 c8 c9 b7 b7 b7 d2 d2');
 earthly.discard(0,earthly.players[0].hand[0].id);vote(earthly,{1:'win'});
 assert.equal(earthly.result.analysis.special,'Earthly Hand');assert.deepEqual(earthly.result.payments,[-128,256,-64,-64]);
});

test('a declared Kong interrupts opening-limit eligibility and supplies exactly one replacement',()=>{
 const g=table();g.interrupted=false;g.discardCount=0;g.lastSource='deal';
 g.players[0].hand=H('b3 b3 b3 b3 d1 d2 d3 d4 d5 d6 c7 c8 c9 we');
 g.wall=H('d9 we');const before=ids(g);g.declareKong(0,'b3');
 assert.equal(g.wall.length,1);assert.equal(g.interrupted,true);assert.equal(g.players[0].hand.length,11);
 const a=g.canDeclareWin(0);assert.ok(a);assert.equal(a.special,undefined);assert.equal(a.fan,2);assert.deepEqual(ids(g),before);
});

test('successive concealed Kongs use one extra physical tile each and stop when no replacement remains',()=>{
 const g=table();g.players[0].hand=H('b3 b3 b3 b3 d4 d4 d4 d4 c7 c8 c9 we we dr');g.wall=H('c2 c1');
 const before=ids(g);g.declareKong(0,'b3');assert.ok(g.kongOptions(0).includes('d4'));g.declareKong(0,'d4');
 assert.equal(g.players[0].melds.length,2);assert.equal(g.players[0].hand.length,8);assert.equal(g.wall.length,0);assert.deepEqual(ids(g),before);
 assert.deepEqual(g.kongOptions(0),[]);assert.throws(()=>g.declareKong(0,'c1'),/Invalid Kong/);
});

test('a Flower replacement keeps ordinary-draw scoring and is not a Kong bonus',()=>{
 const g=table({flowers:true});g.players[0].hand=H('b1 b2 b3 d4 d5 d6 c7 c8 c9 dr dr dr we');
 g.wall=H('f2 c9 we');const before=ids(g);g.drawTile(0);
 assert.equal(g.lastSource,'draw');assert.equal(g.lastDraw.type,'we');assert.deepEqual(g.players[0].flowers.map(t=>t.type),['f2']);
 const a=g.canDeclareWin(0);assert.equal(a.fan,2);assert.ok(!a.details.some(x=>x.includes('Kong')));assert.deepEqual(ids(g),before);
});

test('declining one winning type still permits another wait and an own replacement draw clears the lock',()=>{
 const g=table();g.players[1].hand=H('b2 b3 d4 d5 d6 c7 c8 c9 dr dr dr we we');
 g.missedWins[1].add('b1');assert.equal(g.winAnalysis(1,M.core.makeTile('b1'),false),null);assert.ok(g.winAnalysis(1,M.core.makeTile('b4'),false));
 g.drawTile(1,true,'kong');assert.equal(g.missedWins[1].size,0);
 // This test checks the declared Atelier convention: missed wins affect that
 // discarded type, not Riichi-style furiten on every wait.
});

test('Beginner deliberately keeps standard shapes and simplified scoring separate from Atelier',()=>{
 const beginner=table({hkProfile:'beginner',flowers:true,sevenPairs:true});
 assert.equal(beginner.flowersEnabled,false);
 beginner.players[0].hand=H('b1 b9 d1 d9 c1 c9 we ws ww wn dr dg dw we');assert.equal(beginner.canDeclareWin(0),null);
 beginner.players[0].hand=H('b1 b1 b1 d2 d2 d2 c3 c3 c3 b8 b8 b8 we we');
 const a=beginner.canDeclareWin(0);assert.equal(a.fan,4);assert.equal(a.special,undefined);assert.equal(beginner.paymentBase(a),16);
 const expanded=table();expanded.players[0].hand=beginner.players[0].hand.slice();assert.equal(expanded.canDeclareWin(0).special,'Four Concealed Pungs');assert.equal(expanded.canDeclareWin(0).fan,10);
});
