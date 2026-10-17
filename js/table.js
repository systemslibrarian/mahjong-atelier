
(function(M){
  'use strict';
  const {tileset,shuffle,sortHand, count}=M.core;
  const WINDS=['East','South','West','North'];
  class BaseTable {
    constructor(variant,settings={}){
      this.variant=variant;
      this.settings={opponents:'bots',...settings};
      this.players=WINDS.map((name,i)=>({name,seat:i,hand:[],melds:[],discards:[],bot:this.settings.opponents!=='local'&&i!==0,goal:0}));
      this.wall=shuffle(tileset(variant));this.current=0;this.phase='discard';this.claimQueue=[];this.claimVotes=[];this.lastDiscard=null;this.winner=null;this.result=null;this.log=[];
      for(let n=0;n<13;n++)for(let p of this.players)p.hand.push(this.wall.shift());
      this.players[0].hand.push(this.wall.shift());
      this.players.forEach(p=>sortHand(p.hand));
      this.note('East begins with 14 tiles. Choose a tile to discard.');
    }
    note(message){this.log.unshift(message);this.log.length=Math.min(this.log.length,30);}
    who(){if(this.phase==='claims')return this.claimQueue[0]??null; if(this.phase==='charleston')return this.charSeat??null;return this.current;}
    drawReplacement(seat){if(!this.wall.length)return this.endDraw();const tile=this.wall.pop();this.players[seat].hand.push(tile);sortHand(this.players[seat].hand);this.note(`${this.players[seat].name} draws a Kong replacement.`);return true;}
    nextTurn(from){if(!this.wall.length)return this.endDraw();this.current=(from+1)%4;const p=this.players[this.current];p.hand.push(this.wall.shift());sortHand(p.hand);this.phase='discard';this.note(`${p.name} draws from the wall.`);}
    discard(seat,tileId){
      if(this.phase!=='discard'||seat!==this.current)throw Error('Not your discard turn');
      const p=this.players[seat],i=p.hand.findIndex(t=>t.id===tileId);
      if(i<0)throw Error('Tile is not in your hand');
      const tile=p.hand.splice(i,1)[0];p.discards.push(tile);this.lastDiscard={tile,by:seat};this.note(`${p.name} discarded ${M.core.name(tile.type)}.`);
      this.claimVotes=[];this.claimQueue=[];
      for(let step=1;step<=3;step++){
        const other=(seat+step)%4;
        if(this.claimOptions(other,tile,seat).length)this.claimQueue.push(other);
      }
      if(this.claimQueue.length)this.phase='claims';else this.nextTurn(seat);
    }
    offered(){if(this.phase!=='claims'||!this.claimQueue.length)return {seat:null,options:[]};const seat=this.claimQueue[0];return {seat,options:this.claimOptions(seat,this.lastDiscard.tile,this.lastDiscard.by)};}
    submitClaim(seat,code){
      const offer=this.offered();if(offer.seat!==seat)throw Error('Claim is not available for this player');
      if(code!=='pass'){
        const opt=offer.options.find(o=>o.code===code);
        if(!opt)throw Error('Unknown claim');
        this.claimVotes.push({seat,option:opt});
      }
      this.claimQueue.shift();
      if(!this.claimQueue.length)this.resolveClaims();
    }
    resolveClaims(){
      if(!this.claimVotes.length){const from=this.lastDiscard.by;this.lastDiscard=null;this.nextTurn(from);return;}
      const from=this.lastDiscard.by;
      this.claimVotes.sort((a,b)=>b.option.priority-a.option.priority || ((a.seat-from+4)%4)-((b.seat-from+4)%4));
      const {seat,option}=this.claimVotes[0];const p=this.players[seat];const thrower=this.players[from];
      const dropped=thrower.discards.pop();if(!dropped||dropped.id!==this.lastDiscard.tile.id)throw Error('Discard stack mismatch');
      if(option.kind==='win'){
        p.hand.push(dropped);sortHand(p.hand);this.lastDiscard=null;this.current=seat;this.declareWin(seat,false);return;
      }
      const used=[];
      for(const id of option.use){const idx=p.hand.findIndex(t=>t.id===id);if(idx<0)throw Error('Claim material missing');used.push(p.hand.splice(idx,1)[0]);}
      p.melds.push({kind:option.kind,tiles:[...used,dropped],type:option.type||dropped.type,from});
      this.note(`${p.name} calls ${option.kind.toUpperCase()} on ${thrower.name}'s discard.`);
      this.current=seat;this.lastDiscard=null;sortHand(p.hand);this.phase='discard';
      if(option.kind==='kong'&&this.variant==='hk')this.drawReplacement(seat);
    }
    isBotSeat(seat){return seat!=null&&this.players[seat].bot;}
    endDraw(){this.phase='finished';this.result={kind:'draw',message:'The wall is empty. Nobody declared Mahjong.'};this.note(this.result.message);}
    declareWin(seat,selfDraw=true){
      const analysis=this.winAnalysis(seat,null,selfDraw);
      if(!analysis)throw Error('This hand does not satisfy the selected rules');
      this.current=seat;this.winner=seat;this.phase='finished';this.result={kind:'win',seat,analysis,selfDraw,message:`${this.players[seat].name} calls Mahjong!`};this.note(this.result.message);
      return this.result;
    }
    integrity(){
      return this.wall.length + this.players.reduce((sum,p)=>sum+p.hand.length+p.discards.length+p.melds.reduce((n,m)=>n+m.tiles.length,0),0);
    }
    botChooseClaim(offer){
      const win=offer.options.find(o=>o.kind==='win');if(win)return win.code;
      const big=offer.options.find(o=>o.kind==='kong')||offer.options.find(o=>o.kind==='quint')||offer.options.find(o=>o.kind==='pung');
      if(big&&Math.random()<.55)return big.code;
      const chow=offer.options.find(o=>o.kind==='chow');if(chow&&Math.random()<.23)return chow.code;
      return 'pass';
    }
    botChooseDiscard(seat){
      const p=this.players[seat],hand=p.hand;
      const scores=hand.map(t=>{
        let same=count(hand,t.type)-1,sameScore=3.3*same;
        if('bdc'.includes(t.type[0])&&t.type.length===2){let x=+t.type.slice(1);for(const other of hand){if(other.id===t.id || other.type[0]!==t.type[0])continue;const dist=Math.abs(+other.type.slice(1)-x);if(dist===1)sameScore+=1.35;if(dist===2)sameScore+=.6;}}
        if(t.type==='j')sameScore+=99;
        return sameScore+Math.random()*.3;
      });
      return hand[scores.indexOf(Math.min(...scores))].id;
    }
    botStep(){
      if(this.phase==='claims'){
        const offer=this.offered();if(offer.seat!=null&&this.isBotSeat(offer.seat)){this.submitClaim(offer.seat,this.botChooseClaim(offer));return true;}
        return false;
      }
      if(this.phase==='discard'&&this.isBotSeat(this.current)){
        if(this.winAnalysis(this.current,null,true)){this.declareWin(this.current,true);return true;}
        const kongs=this.kongOptions?this.kongOptions(this.current):[];
        if(kongs.length&&Math.random()<.55){this.declareKong(this.current,kongs[0]);return true;}
        this.discard(this.current,this.botChooseDiscard(this.current));return true;
      }
      return false;
    }
  }
  M.BaseTable=BaseTable;
})(globalThis.Mahjong=globalThis.Mahjong||{});
