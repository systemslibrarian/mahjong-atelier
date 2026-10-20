(function(/** @type {Atelier.Registry} */ M){
'use strict';
const coreDependency=M.core,hkDependency=M.hongkongTest,americanDependency=M.americanTest,solitaireDependency=M.solitaireTest;
if(!coreDependency||!hkDependency||!americanDependency)throw Error('Load the table rules engines before coach.js');
const C=coreDependency,HK=hkDependency,AM=americanDependency;
/** @param {Atelier.Tile} t @returns {Atelier.Tile} */
const copyTile=t=>({id:t.id,type:t.type});
/** @param {Atelier.PhysicalMeld} m @returns {Atelier.PhysicalMeld} */
const copyMeld=m=>({kind:m.kind,type:m.type,concealed:!!m.concealed,tiles:m.tiles.map(copyTile)});
// Privacy boundary: downstream analysis receives only this explicit public view.
/** @param {Atelier.Table} g @param {number} seat @returns {Atelier.PublicView} */
function publicView(g,seat){
 const own=g.players[seat];
 return {variant:g.variant,seat,phase:g.phase,current:g.current,hand:own.hand.map(copyTile),melds:own.melds.map(copyMeld),flowers:own.flowers.map(copyTile),
  opponents:g.players.filter(p=>p.seat!==seat).map(p=>({seat:p.seat,melds:p.melds.filter(m=>!m.concealed).map(copyMeld),discards:p.discards.map(copyTile)})),
  discards:g.players.flatMap(p=>p.discards.map(copyTile)),publicMelds:g.players.flatMap(p=>p.seat===seat?p.melds.map(copyMeld):p.melds.filter(m=>!m.concealed).map(copyMeld)),
  expanded:!!g.expanded,minFan:g.minFan||0,seatWind:g.windIndex(seat),prevailing:g.round,flowersEnabled:!!g.flowersEnabled,sevenPairs:!!g.settings.sevenPairs,
  wallCount:g.wall.length,lastSource:g.lastSource,latest:g.lastDiscard?{type:g.lastDiscard.tile.type,by:g.lastDiscard.by}:null};
}
/** @param {Atelier.PublicView} v @param {Atelier.Tile[]} tiles @returns {Atelier.CoachAnalysis|null} */
function winForView(v,tiles){
 if(v.variant==='american'){const card=AM.winningPatterns(tiles,v.melds)[0];return card?{card}:null;}
 /** @type {Atelier.ScoreContext} */
 const context={seat:v.seatWind,prevailing:v.prevailing,selfDraw:true,flowers:v.flowers,flowersEnabled:v.flowersEnabled,source:'draw',lastWall:false,heavenly:false,earthly:false,sevenPairs:v.sevenPairs};
 const values=HK.partitions(tiles,v.melds).map(p=>v.expanded?HK.extendedScore(p,v.melds,tiles,context):HK.fanScore(p,v.melds,v.seatWind,true,v.prevailing));
 if(v.expanded)values.push(...HK.specialHands(tiles,v.melds,context));return values.filter(a=>(a.qualifyingFan??a.fan)>=v.minFan).sort((a,b)=>b.fan-a.fan)[0]||null;
}
/** @param {Atelier.PublicView} v @returns {Record<string,number>} */
function knownCounts(v){return C.countTypes([...v.hand,...v.discards,...v.publicMelds.flatMap(m=>m.tiles)]);}
/** @param {Atelier.Tile[]} hand @param {Atelier.Tile} t @param {Atelier.Variant} variant @returns {Atelier.Support} */
function support(hand,t,variant){const same=hand.filter(x=>x.type===t.type).length-1;let adjacent=0,gapped=0;if(variant==='hk'&&/^[bdc][1-9]$/.test(t.type))for(const o of hand){if(o.type[0]!==t.type[0])continue;const d=Math.abs(+o.type.slice(1)-+t.type.slice(1));if(d===1)adjacent++;if(d===2)gapped++;}return {same,adjacent,gapped,cost:same*3+adjacent*1.35+gapped*.6+(t.type==='j'?100:0)};}
/** @param {Atelier.PublicView} v @returns {Atelier.Alternative[]} */
function alternatives(v){
 if(v.phase!=='discard'||v.current!==v.seat)return [];
 const known=knownCounts(v);
 /** @type {Atelier.TileCode[]} */
 const types=v.variant==='american'?[...C.STANDARD_TYPES,'j','f1','f2','f3','f4','f5','f6','f7','f8']:[...C.STANDARD_TYPES];
 return [...new Map(v.hand.map(t=>[t.type,t])).values()].map(tile=>{
  const remaining=v.hand.filter(t=>t.id!==tile.id),s=support(v.hand,tile,v.variant);
  /** @type {Atelier.Wait[]} */
  const waits=[];
  for(const type of v.wallCount===0?[]:types){const total=type==='j'?8:type[0]==='f'?1:4,unseen=Math.max(0,total-(known[type]||0));if(!unseen)continue;const analysis=winForView(v,[...remaining,{id:-1,type}]);if(analysis)waits.push({type,unseen,fan:analysis.fan??null,pattern:analysis.card?.name??null});}
  const visibleDiscardCount=v.discards.filter(t=>t.type===tile.type).length;
  return {id:tile.id,type:tile.type,waits,unseenWinning:waits.reduce((n,w)=>n+w.unseen,0),support:s,
   rule:`Discarding ${C.name(tile.type)} is legal on your discard turn.`,
   calculation:v.wallCount===0?`Keeps ${remaining.length} concealed tiles. The wall is empty, so no later self-draw is possible. ${tile.type==='j'?'A discarded Joker cannot be claimed.':'A legal final-discard claim may still end the hand.'}`:`Keeps ${remaining.length} concealed tiles. ${waits.length} tile type${waits.length===1?'':'s'} could complete a legal hand on a later ordinary self-draw (${waits.reduce((n,w)=>n+w.unseen,0)} copies not accounted for in your hand and visible tiles).`,
   heuristic:s.same?`Giving up a duplicate reduces a ${s.same+1}-tile group. Compare whether its tiles serve another structure.`:v.variant==='hk'&&(s.adjacent||s.gapped)?`This tile has ${s.adjacent} adjacent and ${s.gapped} one-gap suit partner(s). Keeping it may preserve sequence routes.`:tile.type==='j'?'A Joker is flexible in large American groups; discarding it usually gives up useful options.':'This tile has little local support in the current rack. Discarding it may preserve stronger groups.',
   defense:`${visibleDiscardCount} matching tile${visibleDiscardCount===1?' has':'s have'} already been discarded. That is visible information, not proof this discard is safe.`};
 }).sort((a,b)=>b.unseenWinning-a.unseenWinning||a.support.cost-b.support.cost||a.type.localeCompare(b.type));
}
/** @param {Atelier.SolitaireGeometry} g @returns {Atelier.SolitaireChoice[]} */
function solitaireChoices(g){
 if(!solitaireDependency)throw Error('Load solitaire.js before using Solitaire coaching');
 const S=solitaireDependency;
 const before=new Set(g.available().map(t=>t.id));
 return g.pairs().map(ids=>{const remaining=g.tiles.filter(t=>!t.removed&&!ids.includes(t.id));const occ=new Map(remaining.map(t=>[t.id,t]));const newly=remaining.filter(t=>!before.has(t.id)&&S.free(t,occ)).map(t=>t.id);return {ids,newly,rule:'Both tiles are free and their matching keys agree.',calculation:`Removing this pair makes ${newly.length} previously blocked tile${newly.length===1?'':'s'} free.`,heuristic:'Opening more tiles may give you more choices. This one-step count does not prove the whole board can be cleared.'};}).sort((a,b)=>b.newly.length-a.newly.length);
}
/** @param {Atelier.HongKongTable|Atelier.AmericanTable} g @param {number} seat @returns {string} */
function actionRule(g,seat){
 if(g.phase==='finished')return 'This hand is finished. Read the score breakdown, then choose Next hand.';
 if(g.phase==='opening')return 'East checks the dealt 14 tiles before any pass. A complete original-card hand may win immediately; otherwise Charleston begins.';
 if(g.phase==='passingWin')return 'The three-pass round is complete. East may declare a complete original-card hand at this boundary; no round is interrupted midway.';
 if(g.phase==='blindDeadlock')return 'A blind pass needs incoming tiles. Rechoose first left with at least one rack tile contributed; all racks are unchanged.';
 if(g.phase==='secondChoice')return 'Every player chooses. The second Charleston occurs only with unanimous agreement.';
 if(g.phase==='courtesyChoice')return 'Offer 0–3 tiles. Each opposite pair exchanges the smaller offer; zero declines.';
 if(g.phase==='charleston'&&g.variant==='american')return `Select ${g.passCount(seat)} non-Joker tiles in total${g.canBlind()?', including any incoming tiles you choose to pass blind':''}. Passing a Joker is illegal.`;
 if(g.phase==='robkong')return 'Only a complete qualifying win may take the proposed fourth tile. You cannot claim it for a meld.';
 if(g.phase==='claims')return g.variant==='hk'?'The banner lists claims the engine has verified for your rack. Chow is limited to the preceding seat; Pung/Kong can use any latest discard; Mahjong takes priority.'+(g.expanded?' Thirteen Orphans outranks ordinary wins here. Declining a win blocks another win on the same discarded type until your own next draw.':''):'The banner lists verified claims. A set must fit an exposed original-card row; singles/pairs may use a discard only for a complete win. Discarded Jokers cannot be claimed.';
 return g.variant==='hk'?'Select any rack tile to discard, or declare an eligible winning hand. Kong options appear only when the engine permits them.':'Select a rack tile to discard, redeem an eligible exposed Joker, or declare a complete original-card hand. No Chow calls and no Joker pairs.';
}
M.coach={publicView,winForView,knownCounts,support,alternatives,solitaireChoices,actionRule};
})(globalThis.Mahjong=globalThis.Mahjong||{});
