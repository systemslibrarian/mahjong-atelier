
(function(/** @type {Atelier.Registry} */ M){
  'use strict';
  const coreDependency=M.core;
  if(!coreDependency)throw Error('Load core.js before american.js');
  const C=coreDependency;
  const {count,sortHand,STANDARD_TYPES}=C;
  // These are original beginner patterns, NOT an NMJL published annual card.
  /** @type {Atelier.CardPattern[]} */
  const CARD=[
    {id:'four',name:'Four of a Kindred',groups:[3,3,3,3,2],description:'Four Pungs and one natural Pair. Suit or honor faces; no Flowers.',level:'Exposed · 25 points',value:25},
    {id:'towers',name:'Three Towers',groups:[4,4,4,2],description:'Three Kongs and one natural Pair. Suit or honor faces; no Flowers.',level:'Exposed · 30 points',value:30},
    {id:'parade',name:'Joker Parade',groups:[5,4,3,2],description:'A Quint, a Kong, a Pung and a natural Pair. Suit or honor faces; no Flowers.',level:'Exposed · 35 points',value:35},
    {id:'twins',name:'Twin Comets',groups:[5,5,2,2],description:'Two Quints and two natural Pairs. Suit or honor faces; no Flowers.',level:'Concealed · 40 points',value:40,concealed:true},
    {id:'grand',name:'Grand Lantern',groups:[6,3,3,2],description:'A Sextet, two Pungs and a natural Pair. Suit or honor faces; no Flowers.',level:'Exposed · 40 points',value:40},
    {id:'blooms',name:'Bloom Festival',groups:[1,1,3,3,4,2],flowers:2,description:'Any two individual Flowers or Seasons, two Pungs, a Kong and a natural Pair. All sets and the Pair use suit or honor faces.',level:'Exposed · 30 points',value:30}
  ];
  /** @param {Atelier.ExposureCandidate} meld @returns {boolean} */
  function validExposure(meld){
    if(!meld||!Array.isArray(meld.tiles)||meld.concealed||meld.tiles.length<3||meld.tiles.length>6)return false;
    const type=meld.type??meld.tiles.find(t=>t.type!=='j')?.type;
    // Original-card sets use suit/honor faces. The called natural tile stays in
    // every exposure; all-Joker groups are allowed only in the concealed rack.
    return STANDARD_TYPES.some(face=>face===type)&&meld.tiles.some(t=>t.type===type)&&meld.tiles.every(t=>t.type===type||t.type==='j');
  }
  /** @param {Atelier.Tile[]} hand @param {Atelier.ExposureCandidate[] | undefined} melds @param {Atelier.CardPattern} pattern @returns {boolean} */
  function matchPattern(hand, melds=[],pattern){
    if(!pattern||melds.some(m=>!validExposure(m))||!C.validMaterial([...hand,...melds.flatMap(m=>m.tiles)],'american')||(pattern.concealed&&melds.length)||hand.length+melds.reduce((v,m)=>v+m.tiles.length,0)!==14)return false;
    // An exposure consumes exactly one identically sized set on this custom card.
    let specs=pattern.groups.map((size,i)=>({size,flower:!!pattern.flowers&&size===1}));
    for(const meld of melds){
      const index=specs.findIndex(g=>g.size===meld.tiles.length&&g.size>=3);
      if(index<0)return false;
      specs.splice(index,1);
    }
    /** @type {Record<string,number>} */
    const counts={};let jokers=0;
    for(const tile of hand){if(tile.type==='j')jokers++;else counts[tile.type]=(counts[tile.type]||0)+1;}
    /** @type {Map<string,boolean>} */
    const memo=new Map();
    /** @param {{size:number,flower:boolean}[]} left @param {number} j @returns {boolean} */
    function dfs(left,j){
      if(!left.length)return j===0&&Object.values(counts).every(n=>n===0);
      const key=left.map(x=>x.size+(x.flower?'f':'')).join(',')+'|'+j+'|'+Object.keys(counts).sort().map(k=>k+counts[k]).join(':');
      const cached=memo.get(key);if(cached!==undefined)return cached;
      const [group,...rest]=left;
      const types=group.flower?Object.keys(counts).filter(t=>t[0]==='f'&&counts[t]>0)
        : group.size===2?Object.keys(counts).filter(t=>t!=='j'&&t[0]!=='f'&&counts[t]>=2)
        : [...STANDARD_TYPES.filter(t=>(counts[t]||0)>0),...(j>=group.size?['__joker_only']:[])];
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
  /** @param {Atelier.Tile[]} hand @param {Atelier.ExposureCandidate[]} [melds] @returns {Atelier.CardPattern[]} */
  function winningPatterns(hand,melds=[]){return CARD.filter(c=>matchPattern(hand,melds,c)).sort((a,b)=>b.value-a.value);}
  /** @type {Atelier.PassRoute[]} */
  const ROUTE=[{name:'Right',offset:1},{name:'Across',offset:2},{name:'Left',offset:3}];
  /** @type {Record<number,Atelier.MeldKind>} */
  const EXPOSURE_KINDS={3:'pung',4:'kong',5:'quint',6:'sextet'};
  const Parent=M.BaseTable;
  if(!Parent)throw Error('Load table.js before american.js');
  class AmericanTable extends Parent {
    /** @param {Atelier.Settings} [settings] */
    constructor(settings={}){
      super('american',settings);
      /** @type {'american'} */
      this.variant;
      this.passRoute=[...ROUTE];this.charIndex=0;
      /** @type {(number[]|null)[]} */
      this.charPicks=[null,null,null,null];
      this.charSeat=0;
      /** @type {Atelier.Phase} */
      this.phase='opening';
      this.blindPicks=[0,0,0,0];
      /** @type {(boolean|null)[]} */
      this.secondVotes=[null,null,null,null];
      /** @type {(number|null)[]} */
      this.courtesyOffers=[null,null,null,null];
      /** @type {{seat:number,index:number}|null} */
      this.editableExposure=null;
      /** @type {Atelier.Phase|null} */
      this.pendingPassPhase=null;
      this.note('East checks the dealt rack for an opening win before Charleston.');
    }
    /** @param {number} [seat] @returns {void} */
    beginCharleston(seat=this.dealer){if(this.phase!=='opening'||seat!==this.dealer)throw Error('Only East starts the Charleston');if(this.winAnalysis(seat))throw Error('Declare the completed opening hand before passing');this.phase='charleston';this.note('Charleston begins: Right, Across, Left.');}
    /** @param {number} seat @returns {Atelier.Analysis|null} */
    canDeclareWin(seat){if(['opening','passingWin'].includes(this.phase))return seat===this.dealer?this.winAnalysis(seat):null;return super.canDeclareWin(seat);}
    /** @param {Atelier.Phase} nextPhase @returns {void} */
    offerPassingWin(nextPhase){this.phase=nextPhase;if(this.winAnalysis(this.dealer)){this.pendingPassPhase=nextPhase;this.phase='passingWin';this.current=this.dealer;}}
    /** @param {number} [seat] @returns {void} */
    continuePassing(seat=this.dealer){if(this.phase!=='passingWin'||seat!==this.dealer||this.pendingPassPhase===null)throw Error('Only East decides at this passing boundary');this.phase=this.pendingPassPhase;this.pendingPassPhase=null;}
    /** @returns {void} */
    retryBlindPass(){if(this.phase!=='blindDeadlock')throw Error('No blocked blind pass');this.charPicks=[null,null,null,null];this.blindPicks=[0,0,0,0];this.charSeat=0;this.phase='charleston';}
    /** @param {number} seat @returns {number} */
    passCount(seat){
      if(!this.passRoute[this.charIndex]?.courtesy)return 3;
      const own=this.courtesyOffers[seat],opposite=this.courtesyOffers[(seat+2)%4];
      if(own===null||opposite===null)throw Error('Courtesy offers are not complete');
      return Math.min(own,opposite);
    }
    /** @returns {boolean} */
    canBlind(){return this.phase==='charleston'&&!this.passRoute[this.charIndex]?.courtesy&&[2,5].includes(this.charIndex);}
    /** @param {number} seat @param {boolean} yes @returns {void} */
    chooseSecond(seat,yes){
      if(this.phase!=='secondChoice'||seat!==this.charSeat)throw Error('Not your Charleston decision');this.secondVotes[seat]=!!yes;this.charSeat++;
      if(this.charSeat===4){if(this.secondVotes.every(Boolean)){this.passRoute.push({name:'Left',offset:3},{name:'Across',offset:2},{name:'Right',offset:1});this.phase='charleston';this.charSeat=0;this.note('All players agreed to a second Charleston.');}else{this.note('Second Charleston declined.');this.beginCourtesy();}}
    }
    /** @param {number} seat @param {number} n @returns {void} */
    chooseCourtesy(seat,n){
      if(this.phase!=='courtesyChoice'||seat!==this.charSeat||!Number.isInteger(n)||n<0||n>3)throw Error('Choose a courtesy offer from 0 to 3');this.courtesyOffers[seat]=n;this.charSeat++;
      if(this.charSeat===4){this.passRoute.push({name:'Across',offset:2,courtesy:true});this.phase='charleston';this.charSeat=0;this.note('Courtesy pairs exchange the smaller of their two offers. Zero declines.');}
    }
    /** @returns {void} */
    beginCourtesy(){this.phase='courtesyChoice';this.charSeat=0;}
    /** @returns {void} */
    startPlay(){this.phase='discard';this.current=this.dealer;this.lastSource='deal';this.note('Passing complete. East makes the first discard.');}
    /** @param {number} seat @param {Atelier.Tile|null} [extra] @param {boolean} [selfDraw] @returns {Atelier.AmericanAnalysis|null} */
    winAnalysis(seat,extra=null,selfDraw=true){
      const p=this.players[seat],all=extra?[...p.hand,extra]:p.hand;
      const matched=winningPatterns(all,p.melds)[0];
      return matched?{card:matched,jokerFree:![...all,...p.melds.flatMap(m=>m.tiles)].some(t=>t.type==='j'),details:[`Original practice card · ${matched.name}`,matched.concealed?'Concealed hand':'Exposures permitted']}:null;
    }
    /** @param {number} seat @param {boolean} [selfDraw] @returns {Atelier.WinResult} */
    declareWin(seat,selfDraw=true){
      if(['opening','passingWin'].includes(this.phase)){if(!selfDraw||!this.canDeclareWin(seat))throw Error('No valid dealer opening win');this.phase='discard';this.current=this.dealer;this.lastSource='deal';}
      // Exposing the winning discard does not turn it into a self-picked tile.
      if(selfDraw&&this.phase==='discard'&&this.lastSource==='claim'){
        const from=this.players[seat].melds.at(-1)?.from;
        if(from===undefined)throw Error('The winning exposure has no discarder');
        this.winningFrom=from;return super.declareWin(seat,false);
      }
      return super.declareWin(seat,selfDraw);
    }
    /** @param {Atelier.AmericanAnalysis} a @returns {number} */
    paymentBase(a){return a.card.value*(a.jokerFree?2:1);}
    /** @param {Atelier.ExposureCandidate[]} melds @returns {boolean} */
    exposureFits(melds){return melds.every(validExposure)&&C.validMaterial(melds.flatMap(m=>m.tiles),'american')&&CARD.some(c=>{if(c.concealed)return !melds.length;const sizes=c.groups.slice();for(const m of melds){const i=sizes.indexOf(m.tiles.length);if(i<0||m.tiles.length<3)return false;sizes.splice(i,1);}return true;});}
    /** @param {number} seat @param {Atelier.Tile} tile @returns {Atelier.Claim[]} */
    claimOptions(seat,tile){
      if(tile.type==='j')return [];const p=this.players[seat],hand=p.hand;
      /** @type {Atelier.Claim[]} */
      const opts=[];
      if(this.winAnalysis(seat,tile,false))opts.push({code:'win',kind:'win',priority:100,title:'Mah Jongg!'});
      if(tile.type[0]==='f'||p.melds.length>=4)return opts;
      const alike=hand.filter(t=>t.type===tile.type),jokers=hand.filter(t=>t.type==='j');
      for(const size of [6,5,4,3]){
        const needed=size-1,maxNatural=Math.min(alike.length,needed),minNatural=Math.max(0,needed-jokers.length);
        for(let natural=maxNatural;natural>=minNatural;natural--){
          const use=[...alike.slice(0,natural),...jokers.slice(0,needed-natural)],kind=EXPOSURE_KINDS[size];
          if(this.exposureFits([...p.melds,{tiles:[...use,tile]}]))opts.push({code:'set-'+size+(natural===maxNatural?'':'-j'+(needed-natural)),kind,type:tile.type,use:use.map(t=>t.id),priority:50,title:`Expose ${size}: ${natural+1} natural + ${needed-natural} Joker${needed-natural===1?'':'s'}`});
        }
      }return opts;
    }
    /** @param {number} seat @returns {number[]} */
    botPassTiles(seat){
      const p=this.players[seat],hand=p.hand;
      const candidates=hand.filter(t=>t.type!=='j');
      candidates.sort((a,b)=>{
        /** @param {Atelier.Tile} t */ const worth=t=>count(hand,t.type)*5+(t.type[0]==='f'?-4:0)+(t.type==='j'?100:0);
        return worth(a)-worth(b)+(.05-Math.random()*.1);
      });
      return candidates.slice(0,3).map(t=>t.id);
    }
    /** @param {number} seat @param {number[]} ids @param {number} [blind] @returns {void} */
    submitPass(seat,ids,blind=0){
      if(this.phase!=='charleston'||seat!==this.charSeat)throw Error('Not the current Charleston seat');
      if(!Number.isInteger(blind)||blind<0||blind>3||(blind&&!this.canBlind()))throw Error('Blind passing is only available on the last pass of a Charleston');
      const wanted=this.passCount(seat)-blind;
      if(!Array.isArray(ids)||ids.length!==wanted||new Set(ids).size!==wanted)throw Error(`Choose exactly ${wanted} tiles from your rack`);
      const p=this.players[seat],picks=ids.map(id=>p.hand.find(t=>t.id===id));if(picks.some(t=>!t||t.type==='j'))throw Error('Pass only non-Joker tiles from your own rack');
      this.charPicks[seat]=ids.slice();this.blindPicks[seat]=blind;this.charSeat++;if(this.charSeat===4)this.finishPass();
    }
    /** @returns {void} */
    finishPass(){
      const picks=this.charPicks;
      if(!picks.every(ids=>ids!==null))throw Error('Every player must choose a pass before exchanging tiles');
      const route=this.passRoute[this.charIndex],packets=this.players.map((p,i)=>p.hand.filter(t=>picks[i].includes(t.id)));
      if(!route.courtesy&&packets.every(packet=>!packet.length)){
        if(this.charIndex===5){this.note('Nobody contributes a tile on the final right pass. Charleston ends without courtesy passing.');this.startPlay();}
        else {this.phase='blindDeadlock';this.charSeat=0;this.note('No tiles are available to forward. Rechoose the first-left pass with at least one rack tile contributed.');}
        return;
      }
      this.players.forEach((p,i)=>{p.hand=p.hand.filter(t=>!picks[i].includes(t.id));});
      const blind=this.blindPicks.slice();
      /** @type {Atelier.Tile[][]} */
      const received=[[],[],[],[]];
      // Route selected physical tiles. A blind recipient forwards without revealing.
      const starter=packets.findIndex(packet=>packet.length===Math.max(...packets.map(p=>p.length)));
      for(let step=0;step<4;step++){const origin=(starter+step*(route.offset===3?3:1))%4;for(const tile of packets[origin]){let seat=(origin+route.offset)%4;while(blind[seat]>0){blind[seat]--;seat=(seat+route.offset)%4;}received[seat].push(tile);}}
      this.players.forEach((p,i)=>{p.hand.push(...received[i]);sortHand(p.hand);});
      this.note(`${route.courtesy?'Courtesy exchange':'Charleston pass'} ${route.name.toLowerCase()} complete${this.blindPicks.some(Boolean)?' (blind tiles forwarded without showing faces)':''}.`);
      this.charIndex++;this.charPicks=[null,null,null,null];this.blindPicks=[0,0,0,0];this.charSeat=0;
      if(route.courtesy){this.startPlay();return;}
      if(this.charIndex===3){this.offerPassingWin('secondChoice');return;}
      if(this.charIndex===6)this.offerPassingWin('courtesyChoice');
    }
    /** @returns {void} */
    resolveClaims(){super.resolveClaims();if(this.phase==='discard'&&this.lastSource==='claim')this.editableExposure={seat:this.current,index:this.players[this.current].melds.length-1};}
    /** @param {number} seat @returns {Atelier.ExposureAdjustment[]} */
    adjustmentOptions(seat){
      const e=this.editableExposure;if(!e||e.seat!==seat||this.current!==seat||this.phase!=='discard')return [];
      const p=this.players[seat],m=p.melds[e.index],claimed=m.tiles.find(t=>t.id===m.claimedTileId);if(!claimed)return [];
      const pool=[...p.hand,...m.tiles].filter(t=>t.id!==claimed.id),naturals=pool.filter(t=>t.type===m.type),jokers=pool.filter(t=>t.type==='j'),out=[];
      for(let size=3;size<=6;size++)for(let natural=Math.min(size-1,naturals.length);natural>=Math.max(0,size-1-jokers.length);natural--){
        const tiles=[claimed,...naturals.slice(0,natural),...jokers.slice(0,size-1-natural)];
        if(this.exposureFits(p.melds.map((x,i)=>i===e.index?{...x,tiles}:x)))out.push({ids:tiles.map(t=>t.id),size,natural:natural+1,jokers:size-1-natural});
      }return out;
    }
    /** @param {number} seat @param {number[]} ids @returns {void} */
    adjustExposure(seat,ids){
      if(!Array.isArray(ids)||new Set(ids).size!==ids.length)throw Error('Choose distinct tiles for the new exposure');
      const option=this.adjustmentOptions(seat).find(o=>o.ids.length===ids.length&&o.ids.every(id=>ids.includes(id)));if(!option)throw Error('This exposure is locked or incompatible; the claimed tile must stay');
      const exposure=this.editableExposure;if(!exposure)throw Error('This exposure is locked');
      const p=this.players[seat],m=p.melds[exposure.index],pool=[...p.hand,...m.tiles];
      const tiles=ids.map(id=>pool.find(t=>t.id===id));
      if(!tiles.every(tile=>tile!==undefined))throw Error('Exposure material missing');
      m.tiles=tiles;m.kind=EXPOSURE_KINDS[ids.length];p.hand=pool.filter(t=>!ids.includes(t.id));sortHand(p.hand);this.note(`${p.name} adjusts the new exposure before discarding or exchanging a Joker.`);
    }
    /** @param {number} seat @param {number} id @returns {void} */
    discard(seat,id){const result=super.discard(seat,id);this.editableExposure=null;return result;}
    /** @param {number} seat @param {number} fromSeat @param {number} meldIndex @returns {void} */
    exchangeJoker(seat,fromSeat,meldIndex){
      if(this.phase!=='discard'||seat!==this.current||!['draw','claim','exchange'].includes(this.lastSource))throw Error('Joker exchange is only available on your turn after drawing or completing a claim');
      const m=this.players[fromSeat]?.melds[meldIndex];if(!validExposure(m)||!m.tiles.some(t=>t.type==='j'))throw Error('No Joker to redeem');
      const p=this.players[seat],natural=p.hand.find(t=>t.type===m.type);
      if(!natural)throw Error('You need a natural matching tile');
      p.hand.splice(p.hand.findIndex(t=>t.id===natural.id),1);
      const at=m.tiles.findIndex(t=>t.type==='j'),joker=m.tiles[at];m.tiles[at]=natural;p.hand.push(joker);sortHand(p.hand);
      this.lastSource='exchange';this.editableExposure=null;
      this.note(`${p.name} redeems a Joker from an exposed ${C.name(m.type)} set.`);
    }
    /** @param {Atelier.Offer} offer @returns {string} */
    botChooseClaim(offer){
      const win=offer.options.find(o=>o.kind==='win');if(win)return win.code;
      const set=offer.options.filter(o=>o.kind!=='win').sort((a,b)=>a.use.length-b.use.length)[0];
      return set&&Math.random()<.55?set.code:'pass';
    }
    /** @returns {boolean} */
    botStep(){
      if(['opening','passingWin'].includes(this.phase)&&this.isBotSeat(this.dealer)){if(this.canDeclareWin(this.dealer))this.declareWin(this.dealer);else this.beginCharleston(this.dealer);return true;}
      if(this.phase==='secondChoice'&&this.isBotSeat(this.charSeat)){this.chooseSecond(this.charSeat,this.settings.secondCharleston!==false);return true;}
      if(this.phase==='courtesyChoice'&&this.isBotSeat(this.charSeat)){this.chooseCourtesy(this.charSeat,3);return true;}
      if(this.phase==='discard'&&this.isBotSeat(this.current)){if(this.canDeclareWin(this.current)){this.declareWin(this.current);return true;}const hand=this.players[this.current].hand;for(const p of this.players){const i=p.melds.findIndex(m=>!m.concealed&&m.tiles.some(t=>t.type==='j')&&hand.some(t=>t.type===m.type));if(i>=0){this.exchangeJoker(this.current,p.seat,i);return true;}}}
      if(this.phase==='charleston'&&this.isBotSeat(this.charSeat)){
        this.submitPass(this.charSeat,this.botPassTiles(this.charSeat).slice(0,this.passCount(this.charSeat)));return true;
      }
      return super.botStep();
    }
  }
  M.AmericanTable=AmericanTable;
  M.americanTest={CARD,matchPattern,winningPatterns,ROUTE};
})(globalThis.Mahjong=globalThis.Mahjong||{});

