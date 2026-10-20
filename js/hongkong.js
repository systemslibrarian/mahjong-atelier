
(function(/** @type {Atelier.Registry} */ M){
  'use strict';
  const coreDependency=M.core;
  if(!coreDependency)throw Error('Load core.js before hongkong.js');
  const C=coreDependency;
  const {count,countTypes,sortHand}=C;
  const types=C.STANDARD_TYPES;
  /** @param {Atelier.Tile[]} tiles @param {Atelier.PhysicalMeld[]} exposed @returns {boolean} */
  function validHandMaterial(tiles,exposed){
    if(!C.validMaterial([...tiles,...exposed.flatMap(m=>m.tiles||[])]))return false;
    return exposed.every(m=>{const ts=m.tiles.map(t=>t.type);if(m.kind==='chow')return !m.concealed&&ts.length===3&&/^[bdc][1-7]$/.test(m.type)&&[0,1,2].every(n=>ts.some(t=>t===m.type[0]+(+m.type[1]+n)));return ['pung','kong'].includes(m.kind)&&ts.length===(m.kind==='kong'?4:3)&&ts.every(t=>t===m.type)&&(!m.concealed||m.kind==='kong');});
  }
  /** @param {Atelier.Tile[]} tiles @param {Atelier.PhysicalMeld[]} [exposed] @returns {Atelier.Partition[]} */
  function partitions(tiles,exposed=[]){
    if(!validHandMaterial(tiles,exposed))return [];
    const need=4-exposed.length;
    if(need<0||tiles.length!==need*3+2)return [];
    const counts=countTypes(tiles);
    /** @type {Atelier.Partition[]} */
    const result=[];
    /** @param {Atelier.ScoredMeld[]} melds @param {Atelier.StandardTileCode|null} pair */
    function search(melds,pair){
      if(result.length>64)return;
      const first=types.find(t=>(counts[t]||0)>0);
      if(!first){if(pair&&melds.length===need)result.push({pair,melds:[...melds]});return;}
      if(!pair&&counts[first]>=2){counts[first]-=2;search(melds,first);counts[first]+=2;}
      if(melds.length===need)return;
      if(counts[first]>=3){counts[first]-=3;melds.push({kind:'pung',type:first,tiles:[first,first,first]});search(melds,pair);melds.pop();counts[first]+=3;}
      if('bdc'.includes(first[0]) && first.length===2 && +first.slice(1)<=7){
        const a=types.find(t=>t===first[0]+(+first.slice(1)+1)),b=types.find(t=>t===first[0]+(+first.slice(1)+2));
        if(a&&b&&counts[a]>0&&counts[b]>0){counts[first]--;counts[a]--;counts[b]--;melds.push({kind:'chow',type:first,tiles:[first,a,b]});search(melds,pair);melds.pop();counts[first]++;counts[a]++;counts[b]++;}
      }
    }
    search([],null);
    return result;
  }
  /** @param {Atelier.Partition} partition @param {Atelier.PhysicalMeld[]} exposed @param {number} seat @param {boolean} selfDraw @param {number} [prevailing] @returns {Atelier.HongKongAnalysis} */
  function fanScore(partition,exposed,seat,selfDraw,prevailing=0){
    const melds=[...partition.melds,...exposed.map(m=>({kind:m.kind,type:m.type,tiles:m.tiles.map(t=>t.type)}))];
    const vals=[];const pung=melds.filter(m=>m.kind!=='chow');
    let fan=0;
    for(const m of pung){
      if(['dr','dg','dw'].includes(m.type)){fan++;vals.push('Dragon set +1');}
      if(m.type==='w'+['e','s','w','n'][seat]){fan++;vals.push('Seat wind +1');}
      if(m.type==='w'+['e','s','w','n'][prevailing]){fan++;vals.push('Prevailing wind +1');}
    }
    if(pung.length===4){fan+=3;vals.push('All Pungs +3');}
    if(!pung.length&&/^[bdc][1-9]$/.test(partition.pair)){fan++;vals.push('All Chows +1');}
    const all=melds.flatMap(m=>m.tiles).concat([partition.pair,partition.pair]);
    const suits=new Set(all.filter(t=>/^[bdc][1-9]$/.test(t)).map(t=>t[0]));
    const hasHonor=all.some(t=>['we','ws','ww','wn','dr','dg','dw'].includes(t));
    if(suits.size===1){if(hasHonor){fan+=3;vals.push('Half flush +3');}else{fan+=6;vals.push('Full flush +6');}}
    if(selfDraw){fan++;vals.push('Self-draw +1');}
    return {fan,details:vals,partition};
  }
  const honors=C.HONORS, terminals=['b1','b9','c1','c9','d1','d9'];
  /** @param {Atelier.Tile[]} tiles @param {Atelier.PhysicalMeld[]} exposed @param {Atelier.ScoreContext} c @returns {Atelier.HongKongAnalysis[]} */
  function specialHands(tiles,exposed,c){
    if(exposed.length||tiles.length!==14||!C.validMaterial(tiles))return [];const counts=countTypes(tiles),keys=Object.keys(counts);
    /** @type {Atelier.HongKongAnalysis[]} */
    const out=[];
    /** @param {string} name @param {number} fan */
    const add=(name,fan)=>{if(c.heavenly||c.earthly){name+=' / '+(c.heavenly?'Heavenly Hand':'Earthly Hand');fan=10;}out.push({fan,qualifyingFan:fan,details:[name+' · '+fan+' faan (fixed special-hand score)'],special:name});};
    if([...honors,...terminals].every(t=>counts[t]>=1)&&keys.length===13)add('Thirteen Orphans',10);
    if(['b','c','d'].some(s=>keys.every(t=>t[0]===s)&&counts[s+'1']>=3&&counts[s+'9']>=3&&[2,3,4,5,6,7,8].every(n=>counts[s+n]>=1)))add('Nine Gates',10);
    if(c.sevenPairs&&keys.length===7&&keys.every(t=>counts[t]===2))add('Seven distinct pairs (house option)',4);
    return out;
  }
  /** @param {Atelier.Partition} partition @param {Atelier.PhysicalMeld[]} exposed @param {Atelier.Tile[]} tiles @param {Atelier.ScoreContext} c @returns {Atelier.HongKongAnalysis} */
  function extendedScore(partition,exposed,tiles,c){
    const melds=[...partition.melds,...exposed.map(m=>({...m,tiles:m.tiles.map(t=>t.type)}))],sets=melds.filter(m=>m.kind!=='chow'),all=melds.flatMap(m=>m.tiles).concat(partition.pair,partition.pair);
    const dragonSets=sets.filter(m=>['dr','dg','dw'].includes(m.type)).length,windSets=sets.filter(m=>m.type[0]==='w').length;
    const special=[];
    if(all.every(t=>honors.some(h=>h===t)))special.push('All Honors');
    if(all.every(t=>terminals.includes(t)))special.push('All Terminals');
    if(windSets===4)special.push('Big Four Winds');
    if(windSets===3&&partition.pair[0]==='w')special.push('Little Four Winds');
    if(dragonSets===3)special.push('Three Great Scholars');
    if(melds.every(m=>m.kind==='kong'))special.push('Four Kongs');
    if(sets.length===4&&exposed.every(m=>m.concealed)&&c.selfDraw)special.push('Four Concealed Pungs');
    if(c.heavenly)special.push('Heavenly Hand');if(c.earthly)special.push('Earthly Hand');
    for(const [dragon,suit,label] of [['dg','b','Jade Dragon'],['dr','c','Ruby Dragon'],['dw','d','Pearl Dragon']])if(sets.length===4&&sets.some(m=>m.type===dragon)&&all.every(t=>t===dragon||t[0]===suit))special.push(label);
    if(special.length)return {fan:10,qualifyingFan:10,details:[special.join(' / ')+' · 10 faan (fixed limit)'],special:special.join(' / '),partition};
    const a=fanScore(partition,exposed,c.seat,c.selfDraw,c.prevailing);
    // Little Three Dragons has a fixed special-hand score in this named profile.
    if(dragonSets===2&&['dr','dg','dw'].includes(partition.pair))return {fan:4,qualifyingFan:4,details:['Little Three Dragons · 4 faan (fixed special-hand score)'],special:'Little Three Dragons',partition};
    /** @param {string} label @param {number} [n] */
    const add=(label,n=1)=>{a.fan+=n;a.details.push(label+' +'+n);};
    if(c.source==='robkong'&&!c.selfDraw)add('Robbing added Kong');
    if(c.source==='kong'&&c.selfDraw)add('Kong replacement');
    if(c.lastWall)add(c.selfDraw?'Last wall tile':'Last discard');
    a.qualifyingFan=a.fan;
    if(c.flowersEnabled){if(!c.flowers.length)add('No Flowers');else{for(const first of [1,5]){const complete=[0,1,2,3].every(n=>c.flowers.some(f=>f.type==='f'+(first+n)));if(complete)add(first===1?'Complete Flower family':'Complete Season family',2);else if(c.flowers.some(f=>f.type==='f'+(first+c.seat)))add('Own Flower/Season');}}}
    if(a.fan>10){a.details.push('Capped at 10 faan');a.fan=10;}return a;
  }
  const Parent=M.BaseTable;
  if(!Parent)throw Error('Load table.js before hongkong.js');
  class HongKongTable extends Parent {
    /** @param {Atelier.Settings} [settings] */
    constructor(settings={}){
      super('hk',settings);
      /** @type {'hk'} */
      this.variant;
      this.minFan=Number(settings.minFan||0);
      /** @type {Set<Atelier.TileCode>[]} */
      this.missedWins=[new Set(),new Set(),new Set(),new Set()];
      /** @type {Atelier.PendingKong|null} */
      this.pendingKong=null;
      this.note(this.expanded?'Atelier Hong Kong: special hands, full score breakdown, and four wind rounds.':'Beginner profile: four melds and a pair; simplified faan.');
    }
    /** @param {number} seat @param {boolean} [replacement] @param {Atelier.DrawSource} [source] @returns {Atelier.Tile|null} */
    drawTile(seat,replacement=false,source='draw'){const tile=super.drawTile(seat,replacement,source);if(tile)this.missedWins?.[seat]?.clear();return tile;}
    /** @param {number} seat @param {string} code @returns {void} */
    submitClaim(seat,code){const offer=this.offered();const declined=offer.seat===seat&&code!=='win'&&offer.options.some(o=>o.kind==='win');const type=this.phase==='robkong'?this.pendingKong?.tile.type:this.lastDiscard?.tile.type;if(this.expanded&&declined&&type&&(code==='pass'||offer.options.some(o=>o.code===code)))this.missedWins[seat].add(type);return super.submitClaim(seat,code);}
    /** @param {number} seat @param {Atelier.Tile|null} [extra] @param {boolean} [selfDraw] @returns {Atelier.HongKongAnalysis|null} */
    winAnalysis(seat,extra=null,selfDraw=true){
      const p=this.players[seat],tiles=extra?[...p.hand,extra]:p.hand;if(!selfDraw&&extra&&this.expanded&&this.missedWins?.[seat]?.has(extra.type))return null;
      /** @type {Atelier.ScoreContext} */
      const context={seat:this.windIndex(seat),prevailing:this.round,selfDraw,flowers:p.flowers,flowersEnabled:this.flowersEnabled,source:this.phase==='robkong'?'robkong':this.lastSource,lastWall:selfDraw?this.wall.length===0&&['draw','kong'].includes(this.lastSource):this.phase!=='robkong'&&!!this.lastDiscard?.lastWall,heavenly:selfDraw&&this.discardCount===0&&!this.interrupted,earthly:!selfDraw&&this.discardCount===1&&!this.interrupted,sevenPairs:this.settings.sevenPairs===true};
      const candidates=partitions(tiles,p.melds).map(g=>this.expanded?extendedScore(g,p.melds,tiles,context):fanScore(g,p.melds,this.windIndex(seat),selfDraw,this.round));
      if(this.expanded)candidates.push(...specialHands(tiles,p.melds,context));
      return candidates.filter(c=>(c.qualifyingFan??c.fan)>=this.minFan).sort((a,b)=>b.fan-a.fan)[0]||null;
    }
    /** @param {Atelier.HongKongAnalysis} a @returns {number} */
    paymentBase(a){return this.expanded?(a.fan<4?2**a.fan:a.fan<7?16:a.fan<10?32:64):2**Math.min(a.fan,6);}
    /** @param {number} seat @param {Atelier.Tile} tile @param {number} by @returns {Atelier.Claim[]} */
    claimOptions(seat,tile,by){
      const hand=this.players[seat].hand;
      /** @type {Atelier.Claim[]} */
      const options=[];
      const can=this.winAnalysis(seat,tile,false);
      if(can)options.push({code:'win',kind:'win',priority:this.expanded&&can.special?.includes('Thirteen Orphans')?110:100,title:'Mahjong!'});
      if(this.players[seat].melds.length>=4)return options;
      const alike=hand.filter(t=>t.type===tile.type);
      if(alike.length>=3&&this.wall.length)options.push({code:'kong',kind:'kong',type:tile.type,use:alike.slice(0,3).map(t=>t.id),priority:50,title:'Kong · four of a kind'});
      if(alike.length>=2)options.push({code:'pung',kind:'pung',type:tile.type,use:alike.slice(0,2).map(t=>t.id),priority:50,title:'Pung · three of a kind'});
      if((by+1)%4===seat && 'bdc'.includes(tile.type[0])&&tile.type.length===2){
        const n=+tile.type.slice(1), suit=tile.type[0];
        for(const start of [n-2,n-1,n]){
          if(start<1||start>7)continue;
          const needed=[start,start+1,start+2].filter(x=>x!==n).map(x=>suit+x);
          const neededTiles=needed.map(type=>hand.find(t=>t.type===type)).filter(t=>t!==undefined);
          const chowType=types.find(t=>t===suit+start);
          if(neededTiles.length === 2&&chowType) {
            options.push({code:'chow-'+start,kind:'chow',type:chowType,use:neededTiles.map(t=>t.id),priority:40,title:`Chow · ${start}–${start+1}–${start+2} ${C.SUIT_NAMES[suit]}`});
          }
        }
      }
      return options;
    }
    /** @param {number} seat @returns {Atelier.KongOption[]} */
    kongOptions(seat){
      const p=this.players[seat];if(this.phase!=='discard'||seat!==this.current||this.lastSource==='claim'||!this.wall.length)return [];
      const hidden=p.melds.length<4?[...new Set(p.hand.filter(t=>count(p.hand,t.type)===4).map(t=>t.type))]:[];
      /** @type {Atelier.KongOption[]} */
      const options=[...hidden];
      if(this.expanded)for(const meld of p.melds)if(meld.kind==='pung'&&p.hand.some(t=>t.type===meld.type))options.push(`add:${meld.type}`);
      return options;
    }
    /** @param {number} seat @param {Atelier.KongOption} type @returns {void} */
    declareKong(seat,type){
      if(!this.kongOptions(seat).includes(type))throw Error('Invalid Kong');const p=this.players[seat];
      if(type.startsWith('add:')){
        const natural=type.slice(4),tile=p.hand.find(t=>t.type===natural);
        if(!tile)throw Error('Added Kong material missing');
        this.pendingKong={seat,tile,type:tile.type};this.claimVotes=[];this.claimQueue=[];this.phase='robkong';
        for(let step=1;step<4;step++){const other=(seat+step)%4;if(this.robOptions(other).length)this.claimQueue.push(other);}
        this.note(`${p.name} proposes adding a fourth tile to a Pung. Opponents may claim it only to win.`);if(!this.claimQueue.length)this.resolveRob();return;
      }
      const tiles=p.hand.filter(t=>t.type===type).slice(0,4);
      if(tiles.length!==4)throw Error('Concealed Kong material missing');
      p.hand=p.hand.filter(t=>!tiles.some(x=>x.id===t.id));p.melds.push({kind:'kong',tiles,type:tiles[0].type,from:seat,concealed:true});this.interrupted=true;this.note(`${p.name} declares a concealed Kong.`);this.drawReplacement(seat);
    }
    /** @param {number} seat @returns {Atelier.Claim[]} */
    robOptions(seat){const pending=this.pendingKong;if(!pending)throw Error('No added Kong to claim');const a=this.winAnalysis(seat,pending.tile,false);return a?[{code:'win',kind:'win',priority:a.special?.includes('Thirteen Orphans')?110:100,title:'Mahjong · rob the added Kong'}]:[];}
    /** @returns {void} */
    resolveRob(){
      const pending=this.pendingKong;if(!pending)throw Error('No added Kong to resolve');
      const {seat,tile,type}=pending,p=this.players[seat];
      if(this.claimVotes.length){this.claimVotes.sort((a,b)=>b.option.priority-a.option.priority||((a.seat-seat+4)%4)-((b.seat-seat+4)%4));const winner=this.claimVotes[0].seat;p.hand=p.hand.filter(t=>t.id!==tile.id);this.players[winner].hand.push(tile);this.current=winner;this.winningFrom=seat;this.declareWin(winner,false);}
      else {const meld=p.melds.find(m=>m.kind==='pung'&&m.type===type);if(!meld)throw Error('The proposed added Kong has no exposed Pung');p.hand=p.hand.filter(t=>t.id!==tile.id);meld.kind='kong';meld.tiles.push(tile);this.interrupted=true;this.phase='discard';this.current=seat;this.drawReplacement(seat);}
      this.pendingKong=null;
    }
  }

  M.HongKongTable=HongKongTable;
  M.hongkongTest={partitions,fanScore,extendedScore,specialHands};
})(globalThis.Mahjong=globalThis.Mahjong||{});

