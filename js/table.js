(function(M){
'use strict';
const {tileset,shuffle,sortHand,count}=M.core;
const WINDS=['East','South','West','North'];
class BaseTable {
 constructor(variant,settings={}){
  this.variant=variant;this.settings={opponents:'bots',...settings};
  const match=settings.match||{};
  this.dealer=Number.isInteger(match.dealer)?match.dealer:0;this.round=match.round||0;this.rotations=match.rotations||0;this.handNumber=(match.hands||0)+1;this.scores=(match.scores||[0,0,0,0]).slice();
  this.expanded=variant==='hk'&&settings.hkProfile==='atelier';this.flowersEnabled=this.expanded&&settings.flowers!==false;
  this.players=WINDS.map((_,i)=>({name:settings.opponents==='local'?`Player ${i+1}`:i===0?'You':`Player ${i+1}`,seat:i,hand:[],melds:[],flowers:[],discards:[],bot:this.settings.opponents!=='local'&&i!==0}));
  this.wall=shuffle(tileset(this.flowersEnabled?'solitaire':variant));this.current=this.dealer;this.phase='discard';this.claimQueue=[];this.claimVotes=[];this.lastDiscard=null;this.winner=null;this.result=null;this.log=[];this.lastSource='deal';this.lastDraw=null;this.discardCount=0;this.interrupted=false;
  for(let n=0;n<13;n++)for(let step=0;step<4;step++)this.drawTile((this.dealer+step)%4,false,'deal');
  this.drawTile(this.dealer,false,'deal');this.players.forEach(p=>sortHand(p.hand));this.note(`${this.players[this.dealer].name} is East and begins with 14 tiles.`);
 }
 windIndex(seat){return (seat-this.dealer+4)%4;}
 windName(seat){return WINDS[this.windIndex(seat)];}
 note(message){this.log.unshift(message);this.log.length=Math.min(this.log.length,40);}
 who(){if(this.phase==='claims'||this.phase==='robkong')return this.claimQueue[0]??null;if(['charleston','secondChoice','courtesyChoice'].includes(this.phase))return this.charSeat;return this.current;}
 drawTile(seat,replacement=false,source='draw'){
  while(this.wall.length){const tile=replacement?this.wall.pop():this.wall.shift();if(this.flowersEnabled&&tile.type[0]==='f'){this.players[seat].flowers.push(tile);replacement=true;continue;}this.players[seat].hand.push(tile);this.lastDraw=tile;this.lastSource=source;sortHand(this.players[seat].hand);return tile;}return null;
 }
 drawReplacement(seat){if(!this.drawTile(seat,true,'kong'))return this.endDraw();this.note(`${this.players[seat].name} draws a Kong replacement.`);return true;}
 nextTurn(from){this.current=(from+1)%4;if(!this.drawTile(this.current))return this.endDraw();this.phase='discard';this.note(`${this.players[this.current].name} draws from the wall.`);}
 discard(seat,tileId){
  if(this.phase!=='discard'||seat!==this.current)throw Error('Not your discard turn');const p=this.players[seat],i=p.hand.findIndex(t=>t.id===tileId);if(i<0)throw Error('Tile is not in your hand');
  const tile=p.hand.splice(i,1)[0];p.discards.push(tile);this.discardCount++;this.lastDiscard={tile,by:seat,lastWall:this.wall.length===0};this.note(`${p.name} discarded ${M.core.name(tile.type)}.`);this.claimVotes=[];this.claimQueue=[];
  for(let step=1;step<=3;step++){const other=(seat+step)%4;if(this.claimOptions(other,tile,seat).length)this.claimQueue.push(other);}
  if(this.claimQueue.length)this.phase='claims';else{this.lastDiscard=null;this.nextTurn(seat);}
 }
 offered(){if(!['claims','robkong'].includes(this.phase)||!this.claimQueue.length)return {seat:null,options:[]};const seat=this.claimQueue[0];return {seat,options:this.phase==='robkong'?this.robOptions(seat):this.claimOptions(seat,this.lastDiscard.tile,this.lastDiscard.by)};}
 submitClaim(seat,code){const offer=this.offered();if(offer.seat!==seat)throw Error('Claim is not available for this player');if(code!=='pass'){const opt=offer.options.find(o=>o.code===code);if(!opt)throw Error('Unknown claim');this.claimVotes.push({seat,option:opt});}this.claimQueue.shift();if(!this.claimQueue.length)this.resolveClaims();}
 resolveClaims(){
  if(this.phase==='robkong')return this.resolveRob();
  if(!this.claimVotes.length){const from=this.lastDiscard.by;this.lastDiscard=null;this.nextTurn(from);return;}
  const from=this.lastDiscard.by;this.claimVotes.sort((a,b)=>b.option.priority-a.option.priority||((a.seat-from+4)%4)-((b.seat-from+4)%4));const {seat,option}=this.claimVotes[0],p=this.players[seat],thrower=this.players[from];
  const dropped=thrower.discards.pop();if(!dropped||dropped.id!==this.lastDiscard.tile.id)throw Error('Discard stack mismatch');
  if(option.kind==='win'){p.hand.push(dropped);sortHand(p.hand);this.current=seat;this.winningFrom=from;this.declareWin(seat,false);this.lastDiscard=null;return;}
  const used=option.use.map(id=>p.hand.find(t=>t.id===id));if(used.some(t=>!t))throw Error('Claim material missing');p.hand=p.hand.filter(t=>!option.use.includes(t.id));p.melds.push({kind:option.kind,tiles:[...used,dropped],type:option.type||dropped.type,from});
  this.note(`${p.name} calls ${option.kind.toUpperCase()} on ${thrower.name}'s discard.`);this.interrupted=true;this.current=seat;this.lastDiscard=null;sortHand(p.hand);this.phase='discard';this.lastSource='claim';if(option.kind==='kong'&&this.variant==='hk')this.drawReplacement(seat);
 }
 isBotSeat(seat){return seat!=null&&this.players[seat].bot;}
 endDraw(){this.phase='finished';this.result={kind:'draw',message:'The wall is empty. Nobody declared Mahjong.',payments:[0,0,0,0]};this.note(this.result.message);return false;}
 canDeclareWin(seat){return this.phase==='discard'&&this.current===seat&&(this.variant!=='hk'||this.lastSource!=='claim')?this.winAnalysis(seat,null,true):null;}
 declareWin(seat,selfDraw=true){
  if(this.phase==='finished'||seat!==this.current||!['discard','claims','robkong'].includes(this.phase))throw Error('Not a winning opportunity');
  if(selfDraw&&!this.canDeclareWin(seat))throw Error('Draw a winning tile before declaring');const analysis=this.winAnalysis(seat,null,selfDraw);if(!analysis)throw Error('This hand does not satisfy the selected rules');
  this.winner=seat;this.result={kind:'win',seat,analysis,selfDraw,from:selfDraw?null:this.winningFrom,message:`${this.players[seat].name} calls Mahjong!`};
  const base=this.paymentBase?this.paymentBase(analysis):1;const payments=this.players.map(p=>p.seat===seat?0:-base*(selfDraw||p.seat===this.winningFrom?2:1));payments[seat]=-payments.reduce((a,b)=>a+b,0);this.result.payments=payments;this.result.base=base;this.scores=this.scores.map((s,i)=>s+payments[i]);this.phase='finished';this.note(this.result.message);return this.result;
 }
 nextHand(){
  if(this.phase!=='finished')throw Error('Finish this hand first');
  const repeat=this.variant==='hk'&&(this.result.kind==='draw'||this.winner===this.dealer);const rotations=this.rotations+(repeat?0:1);if(rotations>=16)return null;
  return new this.constructor({...this.settings,match:{dealer:repeat?this.dealer:(this.dealer+1)%4,round:Math.floor(rotations/4),rotations,scores:this.scores,hands:this.handNumber}});
 }
 integrity(){return this.wall.length+this.players.reduce((sum,p)=>sum+p.hand.length+p.flowers.length+p.discards.length+p.melds.reduce((n,m)=>n+m.tiles.length,0),0);}
 botChooseClaim(offer){const win=offer.options.find(o=>o.kind==='win');if(win)return win.code;const big=offer.options.filter(o=>['kong','quint','pung','sextet'].includes(o.kind)).sort((a,b)=>b.priority-a.priority);if(big.length&&Math.random()<.55)return big[0].code;const chow=offer.options.find(o=>o.kind==='chow');return chow&&Math.random()<.23?chow.code:'pass';}
 botChooseDiscard(seat){const hand=this.players[seat].hand;const scores=hand.map(t=>{let score=3.3*(count(hand,t.type)-1);if(this.variant==='hk'&&/^[bdc][1-9]$/.test(t.type)){for(const o of hand){if(o.id===t.id||o.type[0]!==t.type[0])continue;const d=Math.abs(+o.type.slice(1)-+t.type.slice(1));if(d===1)score+=1.35;if(d===2)score+=.6;}}if(t.type==='j')score+=99;return score+Math.random()*.3;});return hand[scores.indexOf(Math.min(...scores))].id;}
 botStep(){if(['claims','robkong'].includes(this.phase)){const offer=this.offered();if(this.isBotSeat(offer.seat)){this.submitClaim(offer.seat,this.botChooseClaim(offer));return true;}return false;}if(this.phase==='discard'&&this.isBotSeat(this.current)){if(this.canDeclareWin(this.current)){this.declareWin(this.current,true);return true;}const kongs=this.kongOptions?this.kongOptions(this.current):[];if(kongs.length&&Math.random()<.55){this.declareKong(this.current,kongs[0]);return true;}this.discard(this.current,this.botChooseDiscard(this.current));return true;}return false;}
}
M.BaseTable=BaseTable;
})(globalThis.Mahjong=globalThis.Mahjong||{});
