
(function(M){
  'use strict';
  const {count,sortHand,STANDARD_TYPES}=M.core;
  // These are original beginner patterns, NOT an NMJL published annual card.
  const CARD=[
    {id:'four',name:'Four of a Kindred',groups:[3,3,3,3,2],description:'Four Pungs and one natural Pair.',level:'Starter'},
    {id:'towers',name:'Three Towers',groups:[4,4,4,2],description:'Three Kongs and one natural Pair.',level:'Strategic'},
    {id:'parade',name:'Joker Parade',groups:[5,4,3,2],description:'A Quint, a Kong, a Pung and a natural Pair.',level:'Joker practice'},
    {id:'twins',name:'Twin Comets',groups:[5,5,2,2],description:'Two Quints and two natural Pairs.',level:'Advanced'},
    {id:'grand',name:'Grand Lantern',groups:[6,3,3,2],description:'A Sextet, two Pungs and a natural Pair.',level:'Advanced'},
    {id:'blooms',name:'Bloom Festival',groups:[1,1,3,3,4,2],flowers:2,description:'Two individual Flowers, two Pungs, a Kong and a natural Pair.',level:'Flowers'}
  ];
  function matchPattern(hand, melds=[],pattern){
    if(!pattern||hand.length+melds.reduce((v,m)=>v+m.tiles.length,0)!==14)return false;
    // An exposure consumes exactly one identically sized set on this custom card.
    let specs=pattern.groups.map((size,i)=>({size,flower:!!pattern.flowers&&size===1}));
    for(const meld of melds){
      const index=specs.findIndex(g=>g.size===meld.tiles.length&&g.size>=3);
      if(index<0)return false;
      if(!meld.tiles.some(t=>t.type===meld.type)||!meld.tiles.every(t=>t.type===meld.type||t.type==='j'))return false;
      specs.splice(index,1);
    }
    const counts={};let jokers=0;
    for(const tile of hand){if(tile.type==='j')jokers++;else counts[tile.type]=(counts[tile.type]||0)+1;}
    const memo=new Map();
    function dfs(left,j){
      if(!left.length)return j===0&&Object.values(counts).every(n=>n===0);
      const key=left.map(x=>x.size+(x.flower?'f':'')).join(',')+'|'+j+'|'+Object.keys(counts).sort().map(k=>k+counts[k]).join(':');
      if(memo.has(key))return memo.get(key);
      const [group,...rest]=left;
      const types=group.flower?Object.keys(counts).filter(t=>t[0]==='f'&&counts[t]>0)
        : group.size===2?Object.keys(counts).filter(t=>t!=='j'&&t[0]!=='f'&&counts[t]>=2)
        : STANDARD_TYPES.filter(t=>(counts[t]||0)>0);
      for(const t of types){
        if(group.flower){counts[t]--;if(dfs(rest,j)){counts[t]++;memo.set(key,true);return true;}counts[t]++;continue;}
        const size=group.size;
        const from=Math.max(1,size-j),to=Math.min(size,counts[t]);
        for(let natural=to;natural>=from;natural--){
          if(size===2 && natural!==2)continue;
          counts[t]-=natural;
          if(dfs(rest,j-(size-natural))){counts[t]+=natural;memo.set(key,true);return true;}
          counts[t]+=natural;
        }
      }
      memo.set(key,false);return false;
    }
    return dfs(specs,jokers);
  }
  const ROUTE=[{name:'Right',offset:1},{name:'Across',offset:2},{name:'Left',offset:3}];
  class AmericanTable extends M.BaseTable {
    constructor(settings={}){
      super('american',settings);
      this.passRoute=[...ROUTE,...(settings.secondCharleston?[{name:'Left',offset:3},{name:'Across',offset:2},{name:'Right',offset:1}]:[])];
      this.charIndex=0;this.charPicks=[null,null,null,null];this.charSeat=0;this.phase='charleston';this.note('The Charleston begins: each player passes three non-Joker tiles to the right.');
    }
    winAnalysis(seat,extra=null){
      const p=this.players[seat],all=extra?[...p.hand,extra]:p.hand;
      const matched=CARD.find(c=>matchPattern(all,p.melds,c));
      return matched?{card:matched,details:[`Original practice card · ${matched.name}`]}:null;
    }
    claimOptions(seat,tile){
      const hand=this.players[seat].hand,opts=[];
      if(this.winAnalysis(seat,tile,false))opts.push({code:'win',kind:'win',priority:100,title:'Mah Jongg!'});
      if(tile.type==='j'||tile.type[0]==='f'||this.players[seat].melds.length>=4)return opts;
      const alike=hand.filter(t=>t.type===tile.type),jokers=hand.filter(t=>t.type==='j');
      for(const size of [5,4,3]){
        if(!CARD.some(c=>c.groups.includes(size)))continue;
        const needed=size-1;
        if(alike.length+jokers.length<needed)continue;
        const use=[...alike.slice(0,needed),...jokers.slice(0,Math.max(0,needed-alike.length))].slice(0,needed);
        if(use.length===needed)opts.push({code:'set-'+size,kind:size===5?'quint':size===4?'kong':'pung',type:tile.type,use:use.map(t=>t.id),priority:60+size,title:`Expose ${size} matching tiles`});
      }
      return opts;
    }
    botPassTiles(seat){
      const p=this.players[seat],hand=p.hand;
      const candidates=hand.filter(t=>t.type!=='j');
      candidates.sort((a,b)=>{
        const worth=t=>count(hand,t.type)*5+(t.type[0]==='f'?-4:0)+(t.type==='j'?100:0);
        return worth(a)-worth(b)+(.05-Math.random()*.1);
      });
      return candidates.slice(0,3).map(t=>t.id);
    }
    submitPass(seat,ids){
      if(this.phase!=='charleston'||seat!==this.charSeat)throw Error('Not the current Charleston seat');
      if(!Array.isArray(ids)||ids.length!==3||new Set(ids).size!==3)throw Error('Choose exactly three tiles to pass');
      const p=this.players[seat],picks=ids.map(id=>p.hand.find(t=>t.id===id));
      if(picks.some(t=>!t||t.type==='j'))throw Error('Jokers may not be passed');
      this.charPicks[seat]=ids.slice();
      this.charSeat++;
      if(this.charSeat===4)this.finishPass();
    }
    finishPass(){
      const route=this.passRoute[this.charIndex];const packets=[];
      for(let p of this.players){
        const ids=this.charPicks[p.seat];if(!ids||ids.length!==3)throw Error('Incomplete Charleston round');
        const selected=p.hand.filter(t=>ids.includes(t.id));if(selected.length!==3)throw Error('Charleston picks disappeared');
        packets.push(selected);p.hand=p.hand.filter(t=>!ids.includes(t.id));
      }
      packets.forEach((packet,seat)=>this.players[(seat+route.offset)%4].hand.push(...packet));
      this.players.forEach(p=>sortHand(p.hand));
      this.note(`All players passed three tiles ${route.name.toLowerCase()}.`);
      this.charIndex++;this.charPicks=[null,null,null,null];this.charSeat=0;
      if(this.charIndex>=this.passRoute.length){this.phase='discard';this.current=0;this.note('Charleston complete! East makes the first discard.');}
    }
    exchangeJoker(seat,fromSeat,meldIndex){
      if(this.phase!=='discard'||seat!==this.current)throw Error('Joker exchange is only available on your turn');
      if(fromSeat !== seat)throw Error('Can only exchange from your own exposed melds');
      const m=this.players[fromSeat]?.melds[meldIndex];if(!m||!m.tiles.some(t=>t.type==='j'))throw Error('No Joker to redeem');
      const p=this.players[seat],natural=p.hand.find(t=>t.type===m.type);
      if(!natural)throw Error('You need a natural matching tile');
      p.hand.splice(p.hand.findIndex(t=>t.id===natural.id),1);
      const at=m.tiles.findIndex(t=>t.type==='j'),joker=m.tiles[at];m.tiles[at]=natural;p.hand.push(joker);sortHand(p.hand);
      this.note(`${p.name} redeems a Joker from an exposed ${M.core.name(m.type)} set.`);
    }
    botChooseClaim(offer){
      const win=offer.options.find(o=>o.kind==='win');if(win)return win.code;
      const set=offer.options.filter(o=>o.kind!=='win').sort((a,b)=>a.use.length-b.use.length)[0];
      return set&&Math.random()<.55?set.code:'pass';
    }
    botStep(){
      if(this.phase==='charleston'&&this.isBotSeat(this.charSeat)){
        this.submitPass(this.charSeat,this.botPassTiles(this.charSeat));return true;
      }
      return super.botStep();
    }
  }
  M.AmericanTable=AmericanTable;
  M.americanTest={CARD,matchPattern,ROUTE};
})(globalThis.Mahjong=globalThis.Mahjong||{});
