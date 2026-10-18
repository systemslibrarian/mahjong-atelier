
(function(M){
  'use strict';
  const {count,sortHand,STANDARD_TYPES}=M.core;
  // These are original beginner patterns, NOT an NMJL published annual card.
  const CARD=[
    {id:'four',name:'Four of a Kindred',groups:[3,3,3,3,2],description:'Four Pungs and one natural Pair.',level:'Exposed · 25 points',value:25},
    {id:'towers',name:'Three Towers',groups:[4,4,4,2],description:'Three Kongs and one natural Pair.',level:'Exposed · 30 points',value:30},
    {id:'parade',name:'Joker Parade',groups:[5,4,3,2],description:'A Quint, a Kong, a Pung and a natural Pair.',level:'Exposed · 35 points',value:35},
    {id:'twins',name:'Twin Comets',groups:[5,5,2,2],description:'Two Quints and two natural Pairs.',level:'Concealed · 40 points',value:40,concealed:true},
    {id:'grand',name:'Grand Lantern',groups:[6,3,3,2],description:'A Sextet, two Pungs and a natural Pair.',level:'Exposed · 40 points',value:40},
    {id:'blooms',name:'Bloom Festival',groups:[1,1,3,3,4,2],flowers:2,description:'Two individual Flowers, two Pungs, a Kong and a natural Pair.',level:'Exposed · 30 points',value:30}
  ];
  function matchPattern(hand, melds=[],pattern){
    if(!pattern||(pattern.concealed&&melds.length)||hand.length+melds.reduce((v,m)=>v+m.tiles.length,0)!==14)return false;
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
        : STANDARD_TYPES.filter(t=>(counts[t]||0)>0).concat(j>=group.size?['__joker_only']:[]);
      for(const t of types){
        if(group.flower){counts[t]--;if(dfs(rest,j)){counts[t]++;memo.set(key,true);return true;}counts[t]++;continue;}
        const size=group.size;
        const from=Math.max(size===2?2:0,size-j),to=Math.min(size,counts[t]||0);
        for(let natural=to;natural>=from;natural--){
          if(size===2 && natural!==2)continue;
          counts[t]=(counts[t]||0)-natural;
          if(dfs(rest,j-(size-natural))){counts[t]+=natural;memo.set(key,true);return true;}
          counts[t]+=natural;
        }
      }
      memo.set(key,false);return false;
    }
    return dfs(specs,jokers);
  }
  function winningPatterns(hand,melds=[]){return CARD.filter(c=>matchPattern(hand,melds,c)).sort((a,b)=>b.value-a.value);}
  const ROUTE=[{name:'Right',offset:1},{name:'Across',offset:2},{name:'Left',offset:3}];
  class AmericanTable extends M.BaseTable {
    constructor(settings={}){
      super('american',settings);this.passRoute=[...ROUTE];this.charIndex=0;this.charPicks=[null,null,null,null];this.charSeat=0;this.phase='charleston';this.blindPicks=[0,0,0,0];this.secondVotes=[null,null,null,null];this.courtesyOffers=[null,null,null,null];this.note('Charleston: pass three non-Joker tiles to the right.');
    }
    passCount(seat){return this.passRoute[this.charIndex]?.courtesy?Math.min(this.courtesyOffers[seat],this.courtesyOffers[(seat+2)%4]):3;}
    canBlind(){return this.phase==='charleston'&&!this.passRoute[this.charIndex]?.courtesy&&[2,5].includes(this.charIndex);}
    chooseSecond(seat,yes){
      if(this.phase!=='secondChoice'||seat!==this.charSeat)throw Error('Not your Charleston decision');this.secondVotes[seat]=!!yes;this.charSeat++;
      if(this.charSeat===4){if(this.secondVotes.every(Boolean)){this.passRoute.push({name:'Left',offset:3},{name:'Across',offset:2},{name:'Right',offset:1});this.phase='charleston';this.charSeat=0;this.note('All players agreed to a second Charleston.');}else{this.note('Second Charleston declined.');this.beginCourtesy();}}
    }
    chooseCourtesy(seat,n){
      if(this.phase!=='courtesyChoice'||seat!==this.charSeat||!Number.isInteger(n)||n<0||n>3)throw Error('Choose a courtesy offer from 0 to 3');this.courtesyOffers[seat]=n;this.charSeat++;
      if(this.charSeat===4){this.passRoute.push({name:'Across',offset:2,courtesy:true});this.phase='charleston';this.charSeat=0;this.note('Courtesy pairs exchange the smaller of their two offers. Zero declines.');}
    }
    beginCourtesy(){this.phase='courtesyChoice';this.charSeat=0;}
    startPlay(){this.phase='discard';this.current=this.dealer;this.lastSource='deal';this.note('Passing complete. East makes the first discard.');}
    winAnalysis(seat,extra=null){
      const p=this.players[seat],all=extra?[...p.hand,extra]:p.hand;
      const matched=winningPatterns(all,p.melds)[0];
      return matched?{card:matched,jokerFree:![...all,...p.melds.flatMap(m=>m.tiles)].some(t=>t.type==='j'),details:[`Original practice card · ${matched.name}`,matched.concealed?'Concealed hand':'Exposures permitted']}:null;
    }
    declareWin(seat,selfDraw=true){
      // Exposing the winning discard does not turn it into a self-picked tile.
      if(selfDraw&&this.phase==='discard'&&this.lastSource==='claim'){this.winningFrom=this.players[seat].melds.at(-1)?.from;return super.declareWin(seat,false);}
      return super.declareWin(seat,selfDraw);
    }
    paymentBase(a){return a.card.value*(a.jokerFree?2:1);}
    exposureFits(melds){return CARD.some(c=>{if(c.concealed)return !melds.length;const sizes=c.groups.slice();for(const m of melds){const i=sizes.indexOf(m.tiles.length);if(i<0||m.tiles.length<3)return false;sizes.splice(i,1);}return true;});}
    claimOptions(seat,tile){
      if(tile.type==='j')return [];const p=this.players[seat],hand=p.hand,opts=[];
      if(this.winAnalysis(seat,tile,false))opts.push({code:'win',kind:'win',priority:100,title:'Mah Jongg!'});
      if(tile.type[0]==='f'||p.melds.length>=4)return opts;
      const alike=hand.filter(t=>t.type===tile.type),jokers=hand.filter(t=>t.type==='j');
      for(const size of [6,5,4,3]){
        const needed=size-1,use=[...alike.slice(0,needed),...jokers.slice(0,Math.max(0,needed-alike.length))].slice(0,needed),kind=({3:'pung',4:'kong',5:'quint',6:'sextet'})[size];
        if(use.length===needed&&this.exposureFits([...p.melds,{tiles:[...use,tile]}]))opts.push({code:'set-'+size,kind,type:tile.type,use:use.map(t=>t.id),priority:50,title:`Expose ${size} matching tiles`});
      }return opts;
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
    submitPass(seat,ids,blind=0){
      if(this.phase!=='charleston'||seat!==this.charSeat)throw Error('Not the current Charleston seat');
      if(!Number.isInteger(blind)||blind<0||blind>3||(blind&&!this.canBlind()))throw Error('Blind passing is only available on the last pass of a Charleston');
      const wanted=this.passCount(seat)-blind;
      if(!Array.isArray(ids)||ids.length!==wanted||new Set(ids).size!==wanted)throw Error(`Choose exactly ${wanted} tiles from your rack`);
      const p=this.players[seat],picks=ids.map(id=>p.hand.find(t=>t.id===id));if(picks.some(t=>!t||t.type==='j'))throw Error('Pass only non-Joker tiles from your own rack');
      this.charPicks[seat]=ids.slice();this.blindPicks[seat]=blind;this.charSeat++;if(this.charSeat===4)this.finishPass();
    }
    finishPass(){
      const route=this.passRoute[this.charIndex],packets=this.players.map((p,i)=>p.hand.filter(t=>this.charPicks[i].includes(t.id)));
      this.players.forEach((p,i)=>{p.hand=p.hand.filter(t=>!this.charPicks[i].includes(t.id));});
      const blind=this.blindPicks.slice(),received=[[],[],[],[]];
      // Route selected physical tiles. A blind recipient forwards without revealing.
      for(let origin=0;origin<4;origin++)for(const tile of packets[origin]){let seat=(origin+route.offset)%4;while(blind[seat]>0){blind[seat]--;seat=(seat+route.offset)%4;}received[seat].push(tile);}
      // If everybody elects three blind tiles, the closed loop is a no-op.
      this.players.forEach((p,i)=>{p.hand.push(...received[i]);sortHand(p.hand);});
      this.note(`${route.courtesy?'Courtesy exchange':'Charleston pass'} ${route.name.toLowerCase()} complete${this.blindPicks.some(Boolean)?' (blind tiles forwarded without showing faces)':''}.`);
      this.charIndex++;this.charPicks=[null,null,null,null];this.blindPicks=[0,0,0,0];this.charSeat=0;
      if(route.courtesy){this.startPlay();return;}
      if(this.charIndex===3){this.phase='secondChoice';return;}
      if(this.charIndex===6)this.beginCourtesy();
    }
    exchangeJoker(seat,fromSeat,meldIndex){
      if(this.phase!=='discard'||seat!==this.current)throw Error('Joker exchange is only available on your turn');
      const m=this.players[fromSeat]?.melds[meldIndex];if(!m||m.concealed||!m.tiles.some(t=>t.type==='j'))throw Error('No Joker to redeem');
      const p=this.players[seat],natural=p.hand.find(t=>t.type===m.type);
      if(!natural)throw Error('You need a natural matching tile');
      p.hand.splice(p.hand.findIndex(t=>t.id===natural.id),1);
      const at=m.tiles.findIndex(t=>t.type==='j'),joker=m.tiles[at];m.tiles[at]=natural;p.hand.push(joker);sortHand(p.hand);
      this.lastSource='exchange';
      this.note(`${p.name} redeems a Joker from an exposed ${M.core.name(m.type)} set.`);
    }
    botChooseClaim(offer){
      const win=offer.options.find(o=>o.kind==='win');if(win)return win.code;
      const set=offer.options.filter(o=>o.kind!=='win').sort((a,b)=>a.use.length-b.use.length)[0];
      return set&&Math.random()<.55?set.code:'pass';
    }
    botStep(){
      if(this.phase==='secondChoice'&&this.isBotSeat(this.charSeat)){this.chooseSecond(this.charSeat,this.settings.secondCharleston!==false);return true;}
      if(this.phase==='courtesyChoice'&&this.isBotSeat(this.charSeat)){this.chooseCourtesy(this.charSeat,3);return true;}
      if(this.phase==='discard'&&this.isBotSeat(this.current)){const hand=this.players[this.current].hand;for(const p of this.players){const i=p.melds.findIndex(m=>m.tiles.some(t=>t.type==='j')&&hand.some(t=>t.type===m.type));if(i>=0){this.exchangeJoker(this.current,p.seat,i);return true;}}}
      if(this.phase==='charleston'&&this.isBotSeat(this.charSeat)){
        this.submitPass(this.charSeat,this.botPassTiles(this.charSeat).slice(0,this.passCount(this.charSeat)));return true;
      }
      return super.botStep();
    }
  }
  M.AmericanTable=AmericanTable;
  M.americanTest={CARD,matchPattern,winningPatterns,ROUTE};
})(globalThis.Mahjong=globalThis.Mahjong||{});

