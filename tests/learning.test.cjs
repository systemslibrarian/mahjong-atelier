'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
for(const n of ['core','solitaire','table','hongkong','american','coach','learn','practice','path'])require('../js/'+n+'.js');
const M=globalThis.Mahjong;
test('advice never reads hidden opponent racks, concealed meld tiles, or wall identities',()=>{
 const g=new M.Practice('hongkong').game;
 for(const p of g.players.slice(1)){Object.defineProperty(p,'hand',{get(){throw Error('hidden rack');}});p.melds=[{concealed:true,get tiles(){throw Error('hidden meld');}}];}
 g.wall=new Proxy([],{get(_,key){if(key==='length')return 60;throw Error('future wall');}});
 const v=M.coach.publicView(g,0),a=M.coach.alternatives(v);assert.equal(a[0].type,'wn');assert.equal(a[0].waits[0].type,'b3');assert.equal(a[0].unseenWinning,4);
 assert.equal(JSON.stringify(v).includes('hidden'),false);
});
test('visible exhaustion and minimum qualifying score change calculated legal waits',()=>{
 const v=M.coach.publicView(new M.Practice('hongkong').game,0);
 v.discards=[M.core.makeTile('b3')];assert.equal(M.coach.alternatives(v).find(a=>a.type==='wn').unseenWinning,3);
 v.minFan=3;assert.equal(M.coach.alternatives(v).find(a=>a.type==='wn').waits.length,0);
 v.minFan=0;v.discards=Array.from({length:4},()=>M.core.makeTile('b3'));assert.equal(M.coach.alternatives(v).find(a=>a.type==='wn').waits.length,0);
});
test('American local shape heuristics never reward numbered sequences',()=>{
 const hand=['b3','b4','b5'].map(M.core.makeTile);
 assert.equal(M.coach.support(hand,hand[1],'american').adjacent,0);
 assert.equal(M.coach.support(hand,hand[1],'hk').adjacent,2);
});
test('all practice alternatives contain distinct selectable actual tiles and explanations',()=>{
 for(const mode of ['hongkong','american','solitaire']){const p=new M.Practice(mode);p.compare();assert.ok(p.comparisons.length>=2);for(const a of p.comparisons){assert.equal(new Set(a.ids).size,a.ids.length);assert.ok(a.ids.every(id=>p.tiles().some(t=>t.id===id)));for(const field of ['rule','calculation','heuristic'])assert.ok(a[field].length>20);}}
});
test('lesson answers are valid, score examples use engine, comparisons respect separate winning structures',()=>{
 for(const mode of ['hongkong','american','solitaire'])for(const s of M.learningPath.steps(mode)){assert.ok(s.options[s.answer]);assert.ok(s.types.length);assert.ok(s.why.length>30);}
 const c=M.learningPath.comparisons.find(c=>c.id==='complete');assert.match(c.explain('hongkong'),/2 faan/);assert.match(c.explain('american'),/rejects/);assert.match(c.explain('solitaire'),/Not directly applicable/);
 const p=new M.Practice('solitaire'),a=M.coach.solitaireChoices(p.game);assert.equal(a[0].newly.length,2);assert.match(a[0].heuristic,/does not prove/);
});

test('overlapping original rows score the highest compatible value in game and coach',()=>{
 const g=new M.AmericanTable();g.players[0].hand='b1 b1 b1 b2 b2 b2 b3 b3 b3 we we j j j'.split(' ').map(M.core.makeTile);
 assert.deepEqual(M.americanTest.winningPatterns(g.players[0].hand).map(c=>c.value),[40,35,30,25]);
 g.phase='discard';const v=M.coach.publicView(g,0);assert.equal(g.winAnalysis(0).card.id,'grand');assert.equal(M.coach.winForView(v,v.hand).card.id,'grand');
 assert.deepEqual(g.declareWin(0).payments,[240,-80,-80,-80]);
 const p=new M.AmericanTable();p.phase='discard';p.players[0].hand='b1 b1 b1 b2 b2 b2 b3 b3 b3 we we j j j'.split(' ').map(M.core.makeTile);
 const group=p.players[0].hand.splice(0,3);p.players[0].melds=[{kind:'pung',type:'b1',tiles:group}];
 assert.equal(p.winAnalysis(0).card.id,'grand');assert.ok(M.americanTest.winningPatterns(p.players[0].hand,p.players[0].melds).every(c=>!c.concealed));
});

test('exposing the winning discard cannot incorrectly charge every opponent double',()=>{
 const g=new M.AmericanTable();g.phase='discard';g.current=0;g.players[0].hand=['dr'].map(M.core.makeTile);
 g.players[1].hand='b1 b1 b1 b2 b2 b2 b3 b3 b3 dr dr we we'.split(' ').map(M.core.makeTile);g.players[2].hand=[];g.players[3].hand=[];
 g.discard(0,g.players[0].hand[0].id);g.submitClaim(1,'set-3');const result=g.declareWin(1);
 assert.equal(result.selfDraw,false);assert.equal(result.from,0);assert.deepEqual(result.payments,[-100,200,-50,-50]);
});
test('completion through a Joker exchange after claiming a set uses self-picked payments',()=>{
 const g=new M.AmericanTable();g.phase='discard';g.current=0;g.players[0].hand=['dr'].map(M.core.makeTile);
 g.players[1].hand='b1 b1 b1 b2 b2 b2 b3 b3 dr dr we we c9'.split(' ').map(M.core.makeTile);g.players[2].hand=[];g.players[3].hand=[];
 g.players[2].melds=[{kind:'pung',type:'c9',tiles:'c9 c9 j'.split(' ').map(M.core.makeTile),from:3}];
 g.discard(0,g.players[0].hand[0].id);g.submitClaim(1,'set-3');assert.equal(g.canDeclareWin(1),null);g.exchangeJoker(1,2,0);
 const result=g.declareWin(1);assert.equal(result.selfDraw,true);assert.deepEqual(result.payments,[-50,150,-50,-50]);
});
