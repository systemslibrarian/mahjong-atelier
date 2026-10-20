'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
for(const name of ['core','table','hongkong'])require('../js/'+name+'.js');
const M=globalThis.Mahjong;

// The expected-answer implementation deliberately does not import the engine's
// tile catalogue, partitioner, material validator, or scorer.
const SUITS=['b','d','c'];
const WINDS=['we','ws','ww','wn'];
const HONORS=[...WINDS,'dr','dg','dw'];
const CODES=[...SUITS.flatMap(s=>Array.from({length:9},(_,i)=>s+(i+1))),...HONORS];
const SUIT_MAPS=[['b','d','c'],['b','c','d'],['d','b','c'],['d','c','b'],['c','b','d'],['c','d','b']];
const SEEDS=[0xA71E2026,0x13579BDF,0x00C0FFEE];
const H=codes=>codes.map(M.core.makeTile);
const countsOf=codes=>{const counts={};for(const type of codes)counts[type]=(counts[type]||0)+1;return counts;};
function rng(initial){let value=initial>>>0;return ()=>((value=(Math.imul(value,1664525)+1013904223)>>>0)/4294967296);}
function shuffled(items,random){const out=items.slice();for(let i=out.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;}
function physical(sample){return sample.hand.concat(sample.exposed.flatMap(m=>m.tiles));}
function engineMelds(sample){return sample.exposed.map(m=>({...m,tiles:H(m.tiles)}));}

// Build possible component inventories FORWARD from a literal catalogue. An
// honor component has Pungs only. A suited component also has seven Chows.
// Lookup never recursively removes melds from the hand under examination.
function componentCatalogue(width,withChows){
 const melds=[];
 for(let rank=0;rank<width;rank++){const a=Array(width).fill(0);a[rank]=3;melds.push(a);}
 if(withChows)for(let rank=0;rank<7;rank++){const a=Array(width).fill(0);a[rank]=a[rank+1]=a[rank+2]=1;melds.push(a);}
 const tables=Array.from({length:5},()=>[new Set(),new Set()]);
 function append(counts,first,number,paired){
  tables[number][paired].add(counts.join(''));
  if(number===4)return;
  for(let i=first;i<melds.length;i++){
   const next=counts.map((n,k)=>n+melds[i][k]);
   if(next.every(n=>n<=4))append(next,i,number+1,paired);
  }
 }
 append(Array(width).fill(0),0,0,0);
 for(let pair=0;pair<width;pair++){const a=Array(width).fill(0);a[pair]=2;append(a,0,0,1);}
 return tables;
}
const SUITED=componentCatalogue(9,true),HONOR=componentCatalogue(7,false);

function oracle(sample){
 if(sample.exposed.length>4||sample.hand.length!==14-3*sample.exposed.length)return false;
 const all=physical(sample),counts=countsOf(all);
 if(all.some(type=>!CODES.includes(type))||Object.values(counts).some(n=>n>4))return false;
 for(const meld of sample.exposed){
  const codes=meld.tiles;
  if(meld.kind==='chow'){
   const rank=Number(meld.type.slice(1)),suit=meld.type[0];
   if(meld.concealed||!SUITS.includes(suit)||!Number.isInteger(rank)||rank<1||rank>7||codes.length!==3)return false;
   if(codes.slice().sort().join(',')!==[suit+rank,suit+(rank+1),suit+(rank+2)].sort().join(','))return false;
  }else if(!['pung','kong'].includes(meld.kind)||codes.length!==(meld.kind==='kong'?4:3)||codes.some(type=>type!==meld.type)||(meld.concealed&&meld.kind!=='kong'))return false;
 }
 const concealed=countsOf(sample.hand);
 const components=[...SUITS.map(s=>({counts:Array.from({length:9},(_,i)=>concealed[s+(i+1)]||0),table:SUITED})),{counts:HONORS.map(type=>concealed[type]||0),table:HONOR}];
 let pairs=0,melds=0;
 for(const component of components){
  const total=component.counts.reduce((a,b)=>a+b,0),remainder=total%3;
  if(remainder===1)return false;
  const pair=remainder===2?1:0,number=(total-2*pair)/3;
  if(number>4||!component.table[number][pair].has(component.counts.join('')))return false;
  pairs+=pair;melds+=number;
 }
 return pairs===1&&melds===4-sample.exposed.length;
}

function groupChoices(family,kong){
 const codes=family==='h'?HONORS:Array.from({length:9},(_,i)=>family+(i+1));
 const choices=codes.map(type=>({kind:kong?'kong':'pung',type,tiles:Array(kong?4:3).fill(type)}));
 if(family!=='h'&&!kong)for(let rank=1;rank<=7;rank++)choices.push({kind:'chow',type:family+rank,tiles:[family+rank,family+(rank+1),family+(rank+2)]});
 return choices;
}
const FAMILY_ROUTES=[['b','d','c','h'],['b','b','d','h'],['c','c','b','h'],['d','d','c','h'],['b','d','h','h'],['b','b','d','c'],['b','d','c','c'],['b','d','h','h']];
function generatedShape(random,exposedCount,pairFamily,index){
 const pairCodes=pairFamily==='wind'?WINDS:pairFamily==='dragon'?['dr','dg','dw']:Array.from({length:9},(_,i)=>pairFamily+(i+1));
 const pair=pairCodes[Math.floor(random()*pairCodes.length)];
 const sample={hand:[pair,pair],exposed:[]},used=countsOf(sample.hand);
 const route=shuffled(FAMILY_ROUTES[index],random);
 for(let slot=0;slot<4;slot++){
  const exposed=slot<exposedCount;
  // Half the open-hand base cases include a Kong; the other half have only
  // Pungs/Chows. Kong cases include both concealed and exposed declarations.
  const kong=exposed&&index%2===0&&(slot===0||random()<.35);
  const meld=shuffled(groupChoices(route[slot],kong),random).find(m=>{
   const add=countsOf(m.tiles);return Object.entries(add).every(([type,n])=>(used[type]||0)+n<=4);
  });
  assert.ok(meld,'The bounded generator must have a compatible meld');
  for(const type of meld.tiles)used[type]=(used[type]||0)+1;
  if(exposed)sample.exposed.push({...meld,concealed:kong&&random()<.5});else sample.hand.push(...meld.tiles);
 }
 return sample;
}
function transform(sample,suits,random){
 const rename=type=>SUITS.includes(type[0])&&/^[bdc][1-9]$/.test(type)?suits[SUITS.indexOf(type[0])]+type[1]:type;
 return {hand:shuffled(sample.hand.map(rename),random),exposed:shuffled(sample.exposed.map(m=>({...m,type:rename(m.type),tiles:shuffled(m.tiles.map(rename),random)})),random)};
}
function mutants(sample,random){
 const unusedHonor=HONORS.find(type=>!physical(sample).includes(type));
 assert.ok(unusedHonor,'Four melds and a Pair cannot occupy all seven honors');
 const broken={hand:sample.hand.slice(),exposed:sample.exposed};broken.hand[0]=unusedHonor;
 const near={hand:sample.hand.slice(),exposed:sample.exposed},position=Math.floor(random()*near.hand.length);
 const current=countsOf(physical(near));
 const alternatives=CODES.filter(type=>type!==near.hand[position]&&(current[type]||0)<4);
 near.hand[position]=alternatives[Math.floor(random()*alternatives.length)];
 const fifth={hand:sample.hand.slice(),exposed:sample.exposed.slice()};
 const target=CODES.find(type=>!physical(sample).includes(type));assert.ok(target);
 // Preserve four-melds-and-pair structure but use the same new face for a
 // Pung and the Pair: precisely five physical copies is the only defect.
 if(fifth.hand.length>=5)for(let i=0;i<5;i++)fifth.hand[i]=target;
 else{fifth.hand=[target,target];fifth.exposed[0]={kind:'pung',type:target,tiles:Array(3).fill(target),concealed:false};}
 assert.equal(countsOf(physical(fifth))[target],5);
 return [['valid',sample],['broken-pair',broken],['near-miss',near],['fifth-copy',fifth]];
}

test('independent mixed-suit/honor oracle covers 0–4 exposures, Kongs, pair families, and six suit permutations',t=>{
 const totals={baseShapes:0,baseWithKong:0,comparisons:0,valid:0,invalid:0,kinds:{},exposures:[0,0,0,0,0]};
 const exposedKinds=Array.from({length:5},()=>new Set());
 for(const seed of SEEDS){
  const random=rng(seed);
  for(let exposedCount=0;exposedCount<=4;exposedCount++)for(const pairFamily of ['b','d','c','wind','dragon'])for(let index=0;index<FAMILY_ROUTES.length;index++){
   const shape=generatedShape(random,exposedCount,pairFamily,index);
   assert.equal(physical(shape).length,14+shape.exposed.filter(m=>m.kind==='kong').length);
   assert.ok(oracle(shape),'Forward-constructed base shape must be valid');totals.baseShapes++;
   if(shape.exposed.some(m=>m.kind==='kong'))totals.baseWithKong++;
   shape.exposed.forEach(m=>exposedKinds[exposedCount].add(m.kind));
   for(const [kind,original] of mutants(shape,random)){
    const expected=oracle(original);
    if(kind==='valid')assert.equal(expected,true);
    if(kind==='broken-pair'||kind==='fifth-copy')assert.equal(expected,false);
    for(const suits of SUIT_MAPS){
     const sample=transform(original,suits,random);
     const replay=JSON.stringify({seed:'0x'+seed.toString(16),exposedCount,pairFamily,index,kind,suits,hand:sample.hand,exposed:sample.exposed});
     assert.equal(oracle(sample),expected,'Oracle transformation changed validity: '+replay);
     assert.equal(M.hongkongTest.partitions(H(sample.hand),engineMelds(sample)).length>0,expected,replay);
     totals.comparisons++;totals[expected?'valid':'invalid']++;totals.kinds[kind]=(totals.kinds[kind]||0)+1;totals.exposures[exposedCount]++;
    }
   }
  }
 }
 assert.equal(totals.baseShapes,600);assert.equal(totals.baseWithKong,240);assert.equal(totals.comparisons,14400);
 for(let exposedCount=1;exposedCount<=4;exposedCount++)assert.deepEqual([...exposedKinds[exposedCount]].sort(),['chow','kong','pung']);
 assert.deepEqual(totals.exposures,[2880,2880,2880,2880,2880]);
 assert.deepEqual(totals.kinds,{valid:3600,'broken-pair':3600,'near-miss':3600,'fifth-copy':3600});
 assert.ok(totals.valid>=3600&&totals.invalid>=7200);
 t.diagnostic(JSON.stringify({seeds:SEEDS.map(n=>'0x'+n.toString(16)),...totals}));
});

const SOURCES=[
 {id:'ordinary discard',selfDraw:false,source:'draw',lastWall:false,extra:0},
 {id:'ordinary self-draw',selfDraw:true,source:'draw',lastWall:false,extra:1},
 {id:'rob added Kong',selfDraw:false,source:'robkong',lastWall:false,extra:1},
 {id:'Kong replacement',selfDraw:true,source:'kong',lastWall:false,extra:2},
 {id:'last ordinary draw',selfDraw:true,source:'draw',lastWall:true,extra:2},
 {id:'last discard',selfDraw:false,source:'draw',lastWall:true,extra:1},
 {id:'last Kong replacement',selfDraw:true,source:'kong',lastWall:true,extra:3}
];
function bonusCases(seat){return [
 {id:'disabled',enabled:false,tiles:[],extra:0},
 {id:'no bonuses',enabled:true,tiles:[],extra:1},
 {id:'own Flower and Season',enabled:true,tiles:['f'+(seat+1),'f'+(seat+5)],extra:2},
 {id:'both complete families',enabled:true,tiles:Array.from({length:8},(_,i)=>'f'+(i+1)),extra:4},
 {id:'foreign Flower',enabled:true,tiles:['f'+((seat+1)%4+1)],extra:0}
];}

test('4480 literal scoring-context checks cover every dealer/seat/round, winning source, Flower policy, and minimum',t=>{
 const g=new M.HongKongTable({hkProfile:'atelier',flowers:false});
 g.players.forEach(p=>{p.hand=[];p.melds=[];p.flowers=[];});g.interrupted=true;g.discardCount=8;
 let checked=0;
 for(let dealer=0;dealer<4;dealer++)for(let seatWind=0;seatWind<4;seatWind++)for(let round=0;round<4;round++)for(const source of SOURCES)for(const bonus of bonusCases(seatWind))for(const minimum of [0,3]){
  const seat=(dealer+seatWind)%4,p=g.players[seat];g.dealer=dealer;g.current=seat;g.round=round;g.minFan=minimum;g.flowersEnabled=bonus.enabled;
  p.hand=H('d4 d5 d6 c7 c8 c9 we we we d2 d2'.split(' '));p.melds=[{kind:'chow',type:'b1',tiles:H(['b1','b2','b3'])}];p.flowers=H(bonus.tiles);
  g.phase=source.source==='robkong'?'robkong':source.selfDraw?'discard':'claims';g.lastSource=source.source;
  g.wall=source.lastWall?[]:H(['c1']);g.lastDiscard={tile:M.core.makeTile('d2'),by:(seat+3)%4,lastWall:source.lastWall};
  // This hand has three mixed-suit Chows, an East Pung, and a suited Pair.
  // Its only intrinsic faan are the two independently applicable wind points.
  const qualifying=Number(seatWind===0)+Number(round===0)+source.extra;
  const expected=qualifying+bonus.extra;
  const actual=g.winAnalysis(seat,null,source.selfDraw);
  const context=JSON.stringify({dealer,seat,seatWind,round,source:source.id,bonus:bonus.id,minimum,qualifying,expected});
  if(qualifying<minimum)assert.equal(actual,null,context);
  else{assert.ok(actual,context);assert.equal(actual.fan,expected,context);assert.equal(actual.qualifyingFan,qualifying,context);assert.equal(actual.special,undefined,context);}
  checked++;
 }
 assert.equal(checked,4480);t.diagnostic('4480 independently calculated context combinations; Flower faan never repair a qualifying-faan shortfall.');
});

function fixture({current=0,hands={},wall=[]}){
 const g=new M.HongKongTable({hkProfile:'atelier',flowers:false,opponents:'local'});
 const pool=CODES.flatMap(type=>Array.from({length:4},()=>M.core.makeTile(type)));
 const take=type=>{const i=pool.findIndex(tile=>tile.type===type);assert.ok(i>=0,'Fixture exceeds four copies of '+type);return pool.splice(i,1)[0];};
 g.players.forEach(p=>{p.hand=(hands[p.seat]||[]).map(take);p.melds=[];p.flowers=[];p.discards=[];});
 g.wall=wall.map(take);g.current=current;g.phase='discard';g.lastSource='draw';g.lastDiscard=null;g.discardCount=20;g.interrupted=true;g.claimQueue=[];g.claimVotes=[];
 for(const p of g.players)while(p.hand.length<(p.seat===current?14:13))p.hand.push(pool.shift());
 // Tiles outside the prescribed racks/wall are prior discards. This makes each
 // transition fixture a complete four-copy physical inventory, not a short rack.
 g.players[0].discards.push(...pool);assert.equal(g.integrity(),136);
 return g;
}
function identities(g){return [...g.wall,...g.players.flatMap(p=>[...p.hand,...p.discards,...p.melds.flatMap(m=>m.tiles)])].map(t=>t.id).sort((a,b)=>a-b);}
function votes(g,choices){while(['claims','robkong'].includes(g.phase)){const seat=g.offered().seat;g.submitClaim(seat,choices[seat]||'pass');}}
function discardType(g,type){const tile=g.players[g.current].hand.find(t=>t.type===type);assert.ok(tile,'Missing fixture discard '+type);g.discard(g.current,tile.id);}

test('an actual last-wall Chow then discard does not inherit the last-discard faan',()=>{
 const g=fixture({hands:{0:['b3'],1:['b1','b2','c9'],2:'c7 c8 b4 b5 b6 d1 d2 d3 dr dr dr we we'.split(' ')}});
 const before=identities(g);discardType(g,'b3');assert.equal(g.lastDiscard.lastWall,true);votes(g,{1:'chow-1'});
 assert.equal(g.current,1);assert.equal(g.lastSource,'claim');assert.equal(g.wall.length,0);
 discardType(g,'c9');assert.equal(g.lastDiscard.lastWall,false);votes(g,{2:'win'});
 assert.equal(g.winner,2);assert.equal(g.result.analysis.fan,1);assert.ok(!g.result.analysis.details.includes('Last discard +1'));assert.deepEqual(identities(g),before);
});

test('a missed-win lock survives a skipped turn and other players draws until the players own draw',()=>{
 const g=fixture({hands:{0:['b1'],1:'b2 b3 d4 d5 d6 c7 c8 c9 dr dr dr we we'.split(' '),2:['b1','b1','d9']},wall:['b1','c1','b4']});
 const before=identities(g);discardType(g,'b1');votes(g,{1:'pass',2:'pung'});
 assert.equal(g.current,2);assert.ok(g.missedWins[1].has('b1'));
 discardType(g,'d9');votes(g,{});assert.equal(g.current,3);assert.equal(g.lastDraw.type,'b1');assert.ok(g.missedWins[1].has('b1'));
 assert.equal(g.claimOptions(1,g.lastDraw,3).some(o=>o.kind==='win'),false);
 discardType(g,'b1');votes(g,{});assert.equal(g.current,0);assert.ok(g.missedWins[1].has('b1'));
 discardType(g,'c1');votes(g,{});assert.equal(g.current,1);assert.equal(g.lastDraw.type,'b4');assert.equal(g.missedWins[1].size,0);assert.ok(g.canDeclareWin(1));
 assert.deepEqual(identities(g),before);
});
