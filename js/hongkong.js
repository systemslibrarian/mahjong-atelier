
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
  function fanScore(partition,exposed,seat,selfDraw){
    const melds=[...partition.melds,...exposed.map(m=>({kind:m.kind,type:m.type,tiles:m.tiles.map(t=>t.type)}))];
    const vals=[];const pung=melds.filter(m=>m.kind!=='chow');
    let fan=0;
    for(const m of pung){
      if(['dr','dg','dw'].includes(m.type)){fan++;vals.push('Dragon set +1');}
      if(m.type==='w'+['e','s','w','n'][seat]){fan++;vals.push('Seat wind +1');}
      if(m.type==='we'){fan++;vals.push('Prevailing East +1');}
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
  class HongKongTable extends M.BaseTable {
    constructor(settings={}){super('hk',settings);this.minFan=Number(settings.minFan||0);this.note(this.minFan?'Practice scoring uses a simplified 3-faan threshold.':'Beginner rules: any four melds and a pair can win.');}
    winAnalysis(seat,extra=null,selfDraw=true){
      const p=this.players[seat],poss=partitions(extra?[...p.hand,extra]:p.hand,p.melds);
      const candidates=poss.map(g=>fanScore(g,p.melds,seat,selfDraw)).sort((a,b)=>b.fan-a.fan);
      return candidates.find(c=>c.fan>=this.minFan)||null;
    }
    claimOptions(seat,tile,by){
      const hand=this.players[seat].hand,options=[];
      const can=this.winAnalysis(seat,tile,false);
      if(can)options.push({code:'win',kind:'win',priority:100,title:'Mahjong!'});
      if(this.players[seat].melds.length>=4)return options;
      const alike=hand.filter(t=>t.type===tile.type);
      if(alike.length>=3)options.push({code:'kong',kind:'kong',type:tile.type,use:alike.slice(0,3).map(t=>t.id),priority:60,title:'Kong · four of a kind'});
      if(alike.length>=2)options.push({code:'pung',kind:'pung',type:tile.type,use:alike.slice(0,2).map(t=>t.id),priority:50,title:'Pung · three of a kind'});
      if((by+1)%4===seat && 'bdc'.includes(tile.type[0])&&tile.type.length===2){
        const n=+tile.type.slice(1), suit=tile.type[0];
        for(const start of [n-2,n-1,n]){
          if(start<1||start>7)continue;
          const needed=[start,start+1,start+2].filter(x=>x!==n).map(x=>suit+x);
          let t1=hand.find(t=>t.type===needed[0]),t2=hand.find(t=>t.type===needed[1]);
          if(t1&&t2){let use=[t1.id,t2.id];
            options.push({code:'chow-'+start,kind:'chow',type:suit+start,use,priority:40,title:`Chow · ${start}–${start+1}–${start+2} ${M.core.SUIT_NAMES[suit]}`});}
        }
      }
      return options;
    }
    kongOptions(seat){const p=this.players[seat];if(p.melds.length>=4)return [];
      return [...new Set(p.hand.filter(t=>count(p.hand,t.type)===4).map(t=>t.type))];}
    declareKong(seat,type){if(this.phase!=='discard'||this.current!==seat||!this.kongOptions(seat).includes(type))throw Error('Invalid Kong');
      const p=this.players[seat];const tiles=p.hand.filter(t=>t.type===type).slice(0,4);
      p.hand=p.hand.filter(t=>!tiles.some(x=>x.id===t.id));p.melds.push({kind:'kong',tiles,type,from:seat,concealed:true});this.note(`${p.name} declares a concealed Kong.`);
      this.drawReplacement(seat);sortHand(p.hand);
    }
  }
  M.HongKongTable=HongKongTable;
  M.hongkongTest={partitions,fanScore};
})(globalThis.Mahjong=globalThis.Mahjong||{});
