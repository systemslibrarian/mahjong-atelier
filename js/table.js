(function(/** @type {Atelier.Registry} */ M){
'use strict';
const dependency=M.core;
if(!dependency)throw Error('Load core.js before table.js');
const C=dependency;
const {tileset,shuffle,sortHand,count}=C;
const WINDS=['East','South','West','North'];
/** Shared turn machinery. Rule-profile subclasses supply the analysis hooks. */
class BaseTable {
 /** @param {Atelier.Variant} variant @param {Atelier.Settings} [settings] */
 constructor(variant,settings={}){
  this.variant=variant;
  /** @type {Atelier.Settings & {opponents:'bots'|'local'}} */
  this.settings={opponents:'bots',...settings};
  const match=settings.match||{};
  this.dealer=typeof match.dealer==='number'&&Number.isInteger(match.dealer)?match.dealer:0;
  this.round=match.round||0;this.rotations=match.rotations||0;this.handNumber=(match.hands||0)+1;this.scores=(match.scores||[0,0,0,0]).slice();
  this.expanded=variant==='hk'&&settings.hkProfile==='atelier';this.flowersEnabled=this.expanded&&settings.flowers!==false;
  const occupants=match.occupants||[0,1,2,3];
  /** @type {Atelier.Player[]} */
  this.players=WINDS.map((_,i)=>({id:occupants[i],name:settings.opponents==='local'?`Player ${occupants[i]+1}`:occupants[i]===0?'You':`Player ${occupants[i]+1}`,seat:i,hand:[],melds:[],flowers:[],discards:[],bot:this.settings.opponents!=='local'&&occupants[i]!==0}));
  this.wall=shuffle(tileset(this.flowersEnabled?'solitaire':variant));this.current=this.dealer;
  /** @type {Atelier.Phase} */
  this.phase='discard';
  /** @type {number[]} */
  this.claimQueue=[];
  /** @type {Atelier.ClaimVote[]} */
  this.claimVotes=[];
  /** @type {Atelier.LastDiscard|null} */
  this.lastDiscard=null;
  /** @type {number|null} */
  this.winner=null;
  /** @type {Atelier.Result|null} */
  this.result=null;
  /** @type {string[]} */
  this.log=[];
  /** @type {Atelier.DrawSource} */
  this.lastSource='deal';
  /** @type {Atelier.Tile|null} */
  this.lastDraw=null;
  /** @type {number|null} */
  this.winningFrom=null;
  this.discardCount=0;this.interrupted=false;
  // Type-only property declarations: these reads do not shadow subclass methods.
  /** @type {Atelier.Table['winAnalysis']} */
  this.winAnalysis;
  /** @type {Atelier.Table['paymentBase']} */
  this.paymentBase;
  /** @type {Atelier.Table['claimOptions']} */
  this.claimOptions;
  /** @type {Atelier.Table['robOptions']} */
  this.robOptions;
  /** @type {Atelier.Table['resolveRob']} */
  this.resolveRob;
  /** @type {Atelier.Table['kongOptions']} */
  this.kongOptions;
  /** @type {Atelier.Table['declareKong']} */
  this.declareKong;
  /** @type {number|undefined} */
  this.charSeat;
  /** @type {Atelier.ProfileConstructor} */
  this.constructor;
  for(let n=0;n<13;n++)for(let step=0;step<4;step++)this.drawTile((this.dealer+step)%4,false,'deal');
  this.drawTile(this.dealer,false,'deal');this.players.forEach(p=>sortHand(p.hand));this.note(`${this.players[this.dealer].name} is East and begins with 14 tiles.`);
 }
 /** @param {number} seat @returns {number} */
 windIndex(seat){return (seat-this.dealer+4)%4;}
 /** @param {number} seat @returns {string} */
 windName(seat){return WINDS[this.windIndex(seat)];}
 /** @param {string} message @returns {void} */
 note(message){this.log.unshift(message);this.log.length=Math.min(this.log.length,40);}
 /** @returns {number|null} */
 who(){if(this.phase==='claims'||this.phase==='robkong')return this.claimQueue[0]??null;if(['charleston','secondChoice','courtesyChoice'].includes(this.phase))return this.charSeat??null;return this.current;}
 /** @param {number} seat @param {boolean} [replacement] @param {Atelier.DrawSource} [source] @returns {Atelier.Tile|null} */
 drawTile(seat,replacement=false,source='draw'){
  while(this.wall.length){
   const tile=replacement?this.wall.pop():this.wall.shift();
   if(!tile)throw Error('Wall inventory changed during a draw');
   if(this.flowersEnabled&&tile.type[0]==='f'){this.players[seat].flowers.push(tile);replacement=true;continue;}
   this.players[seat].hand.push(tile);this.lastDraw=tile;this.lastSource=source;sortHand(this.players[seat].hand);return tile;
  }return null;
 }
 /** @param {number} seat @returns {boolean} */
 drawReplacement(seat){if(!this.drawTile(seat,true,'kong'))return this.endDraw();this.note(`${this.players[seat].name} draws a Kong replacement.`);return true;}
 /** @param {number} from @returns {void|false} */
 nextTurn(from){this.current=(from+1)%4;if(!this.drawTile(this.current))return this.endDraw();this.phase='discard';this.note(`${this.players[this.current].name} draws from the wall.`);}
 /** @param {number} seat @param {number} tileId @returns {void} */
 discard(seat,tileId){
  if(this.phase!=='discard'||seat!==this.current)throw Error('Not your discard turn');const p=this.players[seat],i=p.hand.findIndex(t=>t.id===tileId);if(i<0)throw Error('Tile is not in your hand');
  const tile=p.hand.splice(i,1)[0];p.discards.push(tile);this.discardCount++;this.lastDiscard={tile,by:seat,lastWall:this.wall.length===0&&this.lastSource!=='claim'};this.note(`${p.name} discarded ${C.name(tile.type)}.`);this.claimVotes=[];this.claimQueue=[];
  for(let step=1;step<=3;step++){const other=(seat+step)%4;if(this.claimOptions(other,tile,seat).length)this.claimQueue.push(other);}
  if(this.claimQueue.length)this.phase='claims';else{this.lastDiscard=null;this.nextTurn(seat);}
 }
 /** @returns {Atelier.Offer} */
 offered(){
  if(!['claims','robkong'].includes(this.phase)||!this.claimQueue.length)return {seat:null,options:[]};
  const seat=this.claimQueue[0];
  if(this.phase==='robkong'){
   if(!this.robOptions)throw Error('This profile has no Kong robbery rule');
   return {seat,options:this.robOptions(seat)};
  }
  if(!this.lastDiscard)throw Error('No discard is available to claim');
  return {seat,options:this.claimOptions(seat,this.lastDiscard.tile,this.lastDiscard.by)};
 }
 /** @param {number} seat @param {string} code @returns {void} */
 submitClaim(seat,code){const offer=this.offered();if(offer.seat!==seat)throw Error('Claim is not available for this player');if(code!=='pass'){const opt=offer.options.find(o=>o.code===code);if(!opt)throw Error('Unknown claim');this.claimVotes.push({seat,option:opt});}this.claimQueue.shift();if(!this.claimQueue.length)this.resolveClaims();}
 /** @returns {void} */
 resolveClaims(){
  if(this.phase==='robkong'){
   if(!this.resolveRob)throw Error('This profile has no Kong robbery rule');
   return this.resolveRob();
  }
  const discard=this.lastDiscard;
  if(!discard)throw Error('No discard is available to resolve');
  if(!this.claimVotes.length){const from=discard.by;this.lastDiscard=null;this.nextTurn(from);return;}
  const from=discard.by;this.claimVotes.sort((a,b)=>b.option.priority-a.option.priority||((a.seat-from+4)%4)-((b.seat-from+4)%4));const {seat,option}=this.claimVotes[0],p=this.players[seat],thrower=this.players[from];
  const dropped=thrower.discards.pop();if(!dropped||dropped.id!==discard.tile.id)throw Error('Discard stack mismatch');
  if(option.kind==='win'){p.hand.push(dropped);sortHand(p.hand);this.current=seat;this.winningFrom=from;this.declareWin(seat,false);this.lastDiscard=null;return;}
  const used=option.use.map(id=>p.hand.find(t=>t.id===id));if(!used.every(t=>t!==undefined))throw Error('Claim material missing');p.hand=p.hand.filter(t=>!option.use.includes(t.id));p.melds.push({kind:option.kind,tiles:[...used,dropped],type:option.type||dropped.type,from,claimedTileId:dropped.id});
  this.note(`${p.name} calls ${option.kind.toUpperCase()} on ${thrower.name}'s discard.`);this.interrupted=true;this.current=seat;this.lastDiscard=null;sortHand(p.hand);this.phase='discard';this.lastSource='claim';if(option.kind==='kong'&&this.variant==='hk')this.drawReplacement(seat);
 }
 /** @param {number|null} seat @returns {boolean} */
 isBotSeat(seat){return seat!=null&&this.players[seat].bot;}
 /** @returns {false} */
 endDraw(){this.phase='finished';this.result={kind:'draw',message:'The wall is empty. Nobody declared Mahjong.',payments:[0,0,0,0]};this.note(this.result.message);return false;}
 /** @param {number} seat @returns {Atelier.Analysis|null} */
 canDeclareWin(seat){return this.phase==='discard'&&this.current===seat&&(this.variant!=='hk'||this.lastSource!=='claim')?this.winAnalysis(seat,null,true):null;}
 /** @param {number} seat @param {boolean} [selfDraw] @returns {Atelier.WinResult} */
 declareWin(seat,selfDraw=true){
  if(this.phase==='finished'||seat!==this.current||!['discard','claims','robkong'].includes(this.phase))throw Error('Not a winning opportunity');
  if(selfDraw&&!this.canDeclareWin(seat))throw Error('Draw a winning tile before declaring');const analysis=this.winAnalysis(seat,null,selfDraw);if(!analysis)throw Error('This hand does not satisfy the selected rules');
  this.winner=seat;
  const base=this.paymentBase?this.paymentBase(analysis):1;const payments=this.players.map(p=>p.seat===seat?0:-base*(selfDraw||p.seat===this.winningFrom?2:1));payments[seat]=-payments.reduce((a,b)=>a+b,0);
  this.result={kind:'win',seat,analysis,selfDraw,from:selfDraw?null:this.winningFrom,message:`${this.players[seat].name} calls Mahjong!`,payments,base};
  this.scores=this.scores.map((s,i)=>s+payments[i]);this.phase='finished';this.note(this.result.message);return this.result;
 }
 /** @returns {Atelier.Table|null} */
 nextHand(){
  if(this.phase!=='finished'||!this.result)throw Error('Finish this hand first');
  const repeat=this.variant==='hk'&&(this.result.kind==='draw'||this.winner===this.dealer);const rotations=this.rotations+(repeat?0:1);if(rotations>=16)return null;
  let dealer=repeat?this.dealer:(this.dealer+1)%4;const occupants=this.players.map(p=>p.id),scores=this.scores.slice();
  if(this.variant==='american'&&rotations%4===0){const pivot=occupants.indexOf(0),right=(pivot+1)%4;[occupants[pivot],occupants[right]]=[occupants[right],occupants[pivot]];[scores[pivot],scores[right]]=[scores[right],scores[pivot]];dealer=right;}
  return new this.constructor({...this.settings,match:{dealer,occupants,round:Math.floor(rotations/4),rotations,scores,hands:this.handNumber}});
 }
 /** @returns {number} */
 integrity(){return this.wall.length+this.players.reduce((sum,p)=>sum+p.hand.length+p.flowers.length+p.discards.length+p.melds.reduce((n,m)=>n+m.tiles.length,0),0);}
 /** @param {Atelier.Offer} offer @returns {string} */
 botChooseClaim(offer){const win=offer.options.find(o=>o.kind==='win');if(win)return win.code;const big=offer.options.filter(o=>['kong','quint','pung','sextet'].includes(o.kind)).sort((a,b)=>b.priority-a.priority);if(big.length&&Math.random()<.55)return big[0].code;const chow=offer.options.find(o=>o.kind==='chow');return chow&&Math.random()<.23?chow.code:'pass';}
 /** @param {number} seat @returns {number} */
 botChooseDiscard(seat){const hand=this.players[seat].hand;const scores=hand.map(t=>{let score=3.3*(count(hand,t.type)-1);if(this.variant==='hk'&&/^[bdc][1-9]$/.test(t.type)){for(const o of hand){if(o.id===t.id||o.type[0]!==t.type[0])continue;const d=Math.abs(+o.type.slice(1)-+t.type.slice(1));if(d===1)score+=1.35;if(d===2)score+=.6;}}if(t.type==='j')score+=99;return score+Math.random()*.3;});return hand[scores.indexOf(Math.min(...scores))].id;}
 /** @returns {boolean} */
 botStep(){
  if(['claims','robkong'].includes(this.phase)){const offer=this.offered();if(offer.seat!==null&&this.isBotSeat(offer.seat)){this.submitClaim(offer.seat,this.botChooseClaim(offer));return true;}return false;}
  if(this.phase==='discard'&&this.isBotSeat(this.current)){if(this.canDeclareWin(this.current)){this.declareWin(this.current,true);return true;}const kongs=this.kongOptions?this.kongOptions(this.current):[];if(kongs.length&&Math.random()<.55){if(!this.declareKong)throw Error('This profile cannot declare a Kong');this.declareKong(this.current,kongs[0]);return true;}this.discard(this.current,this.botChooseDiscard(this.current));return true;}
  return false;
 }
}
M.BaseTable=BaseTable;
})(globalThis.Mahjong=globalThis.Mahjong||{});
