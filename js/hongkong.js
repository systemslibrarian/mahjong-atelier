
(function(M){
  'use strict';
  const {count,countTypes,sortHand}=M.core;
  const types=M.core.STANDARD_TYPES;
  function partitions(tiles,exposed=[]){
    const need=4-exposed.length;
    if(need<0||tiles.length!==need*3+2)return [];
    const counts=countTypes(tiles), result=[];
    function search(melds,pair){
      if(result.length>64)return;
      const first=types.find(t=>(counts[t]||0)>0);
      if(!first){if(pair&&melds.length===need)result.push({pair,melds:[...melds]});return;}
      if(!pair&&counts[first]>=2){counts[first]-=2;search(melds,first);counts[first]+=2;}
      if(melds.length===need)return;
      if(counts[first]>=3){counts[first]-=3;melds.push({kind:'pung',type:first,tiles:[first,first,first]});search(melds,pair);melds.pop();counts[first]+=3;}
      if('bdc'.includes(first[0]) && first.length===2 && +first.slice(1)<=7){
        const a=first[0]+(+first.slice(1)+1),b=first[0]+(+first.slice(1)+2);
        if(counts[a]>0&&counts[b]>0){counts[first]--;counts[a]--;counts[b]--;melds.push({kind:'chow',type:first,tiles:[first,a,b]});search(melds,pair);melds.pop();counts[first]++;counts[a]++;counts[b]++;}
      }
    }
    search([],null);
    return result;
  }
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
    if(!pung.length){fan++;vals.push('All Chows +1');}
    const all=melds.flatMap(m=>m.tiles).concat([partition.pair,partition.pair]);
    const suits=new Set(all.filter(t=>/^[bdc][1-9]$/.test(t)).map(t=>t[0]));
    const hasHonor=all.some(t=>['we','ws','ww','wn','dr','dg','dw'].includes(t));
    if(suits.size===1){if(hasHonor){fan+=3;vals.push('Half flush +3');}else{fan+=6;vals.push('Full flush +6');}}
    if(selfDraw){fan++;vals.push('Self-draw +1');}
    return {fan,details:vals,partition};
  }
  const honors=M.core.HONORS, terminals=['b1','b9','c1','c9','d1','d9'];
  function specialHands(tiles,exposed,c){
    if(exposed.length||tiles.length!==14)return [];const counts=countTypes(tiles),keys=Object.keys(counts),out=[];
    const add=(name,fan)=>out.push({fan,qualifyingFan:fan,details:[name+' · '+fan+' faan (fixed special-hand score)'],special:name});
    if([...honors,...terminals].every(t=>counts[t]>=1)&&keys.length===13)add('Thirteen Orphans',10);
    if(['b','c','d'].some(s=>keys.every(t=>t[0]===s)&&counts[s+'1']>=3&&counts[s+'9']>=3&&[2,3,4,5,6,7,8].every(n=>counts[s+n]>=1)))add('Nine Gates',10);
    if(c.sevenPairs&&keys.length===7&&keys.every(t=>counts[t]===2))add('Seven distinct pairs (house option)',4);
    return out;
  }
  function extendedScore(partition,exposed,tiles,c){
    const melds=[...partition.melds,...exposed.map(m=>({...m,tiles:m.tiles.map(t=>t.type)}))],sets=melds.filter(m=>m.kind!=='chow'),all=melds.flatMap(m=>m.tiles).concat(partition.pair,partition.pair);
    const dragonSets=sets.filter(m=>['dr','dg','dw'].includes(m.type)).length,windSets=sets.filter(m=>m.type[0]==='w').length;
    const special=[];
    if(all.every(t=>honors.includes(t)))special.push('All Honors');
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
    const add=(label,n=1)=>{a.fan+=n;a.details.push(label+' +'+n);};
    if(c.source==='robkong'&&!c.selfDraw)add('Robbing added Kong');
    if(c.source==='kong'&&c.selfDraw)add('Kong replacement');
    if(c.lastWall)add(c.selfDraw?'Last wall tile':'Last discard');
    a.qualifyingFan=a.fan;
    if(c.flowersEnabled){if(!c.flowers.length)add('No Flowers');else{for(const f of c.flowers)if((+f.type.slice(1)-1)%4===c.seat)add('Own Flower/Season');for(const first of [1,5])if([0,1,2,3].every(n=>c.flowers.some(f=>f.type==='f'+(first+n))))add('Complete bonus family',2);}}
    if(a.fan>10){a.details.push('Capped at 10 faan');a.fan=10;}return a;
  }
  class HongKongTable extends M.BaseTable {
    constructor(settings={}){super('hk',settings);this.minFan=Number(settings.minFan||0);this.note(this.expanded?'Atelier Hong Kong: special hands, full score breakdown, and four wind rounds.':'Beginner profile: four melds and a pair; simplified faan.');}
    winAnalysis(seat,extra=null,selfDraw=true){
      const p=this.players[seat],tiles=extra?[...p.hand,extra]:p.hand;
      const context={seat:this.windIndex(seat),prevailing:this.round,selfDraw,flowers:p.flowers,flowersEnabled:this.flowersEnabled,source:this.phase==='robkong'?'robkong':this.lastSource,lastWall:this.wall.length===0,heavenly:selfDraw&&this.discardCount===0&&!this.interrupted,earthly:!selfDraw&&this.discardCount===1&&!this.interrupted,sevenPairs:this.settings.sevenPairs===true};
      const candidates=partitions(tiles,p.melds).map(g=>this.expanded?extendedScore(g,p.melds,tiles,context):fanScore(g,p.melds,this.windIndex(seat),selfDraw,this.round));
      if(this.expanded)candidates.push(...specialHands(tiles,p.melds,context));
      return candidates.filter(c=>(c.qualifyingFan??c.fan)>=this.minFan).sort((a,b)=>b.fan-a.fan)[0]||null;
    }
    paymentBase(a){return this.expanded?(a.fan<4?2**a.fan:a.fan<7?16:a.fan<10?32:64):2**Math.min(a.fan,6);}
    claimOptions(seat,tile,by){
      const hand=this.players[seat].hand,options=[];
      const can=this.winAnalysis(seat,tile,false);
      if(can)options.push({code:'win',kind:'win',priority:100,title:'Mahjong!'});
      if(this.players[seat].melds.length>=4)return options;
      const alike=hand.filter(t=>t.type===tile.type);
      if(alike.length>=3&&this.wall.length)options.push({code:'kong',kind:'kong',type:tile.type,use:alike.slice(0,3).map(t=>t.id),priority:50,title:'Kong · four of a kind'});
      if(alike.length>=2)options.push({code:'pung',kind:'pung',type:tile.type,use:alike.slice(0,2).map(t=>t.id),priority:50,title:'Pung · three of a kind'});
      if((by+1)%4===seat && 'bdc'.includes(tile.type[0])&&tile.type.length===2){
        const n=+tile.type.slice(1), suit=tile.type[0];
        for(const start of [n-2,n-1,n]){
          if(start<1||start>7)continue;
          const needed=[start,start+1,start+2].filter(x=>x!==n).map(x=>suit+x);
          const neededTiles=needed.map(type=>hand.find(t=>t.type===type)).filter(Boolean);
          if(neededTiles.length === 2) {
            options.push({code:'chow-'+start,kind:'chow',type:suit+start,use:neededTiles.map(t=>t.id),priority:40,title:`Chow · ${start}–${start+1}–${start+2} ${M.core.SUIT_NAMES[suit]}`});
          }
        }
      }
      return options;
    }
    kongOptions(seat){
      const p=this.players[seat];if(this.phase!=='discard'||seat!==this.current||this.lastSource==='claim'||!this.wall.length)return [];
      const hidden=p.melds.length<4?[...new Set(p.hand.filter(t=>count(p.hand,t.type)===4).map(t=>t.type))]:[];
      return hidden.concat(this.expanded?p.melds.filter(m=>m.kind==='pung'&&p.hand.some(t=>t.type===m.type)).map(m=>'add:'+m.type):[]);
    }
    declareKong(seat,type){
      if(!this.kongOptions(seat).includes(type))throw Error('Invalid Kong');const p=this.players[seat];
      if(type.startsWith('add:')){
        const natural=type.slice(4),tile=p.hand.find(t=>t.type===natural);this.pendingKong={seat,tile,type:natural};this.claimVotes=[];this.claimQueue=[];this.phase='robkong';
        for(let step=1;step<4;step++){const other=(seat+step)%4;if(this.robOptions(other).length)this.claimQueue.push(other);}
        this.note(`${p.name} proposes adding a fourth tile to a Pung. Opponents may claim it only to win.`);if(!this.claimQueue.length)this.resolveRob();return;
      }
      const tiles=p.hand.filter(t=>t.type===type).slice(0,4);p.hand=p.hand.filter(t=>!tiles.some(x=>x.id===t.id));p.melds.push({kind:'kong',tiles,type,from:seat,concealed:true});this.interrupted=true;this.note(`${p.name} declares a concealed Kong.`);this.drawReplacement(seat);
    }
    robOptions(seat){return this.winAnalysis(seat,this.pendingKong.tile,false)?[{code:'win',kind:'win',priority:100,title:'Mahjong · rob the added Kong'}]:[];}
    resolveRob(){
      const {seat,tile,type}=this.pendingKong,p=this.players[seat];
      if(this.claimVotes.length){this.claimVotes.sort((a,b)=>((a.seat-seat+4)%4)-((b.seat-seat+4)%4));const winner=this.claimVotes[0].seat;p.hand=p.hand.filter(t=>t.id!==tile.id);this.players[winner].hand.push(tile);this.current=winner;this.winningFrom=seat;this.declareWin(winner,false);}
      else {p.hand=p.hand.filter(t=>t.id!==tile.id);const meld=p.melds.find(m=>m.kind==='pung'&&m.type===type);meld.kind='kong';meld.tiles.push(tile);this.interrupted=true;this.phase='discard';this.current=seat;this.drawReplacement(seat);}
      this.pendingKong=null;
    }
  }

  M.HongKongTable=HongKongTable;
  M.hongkongTest={partitions,fanScore,extendedScore,specialHands};
})(globalThis.Mahjong=globalThis.Mahjong||{});

