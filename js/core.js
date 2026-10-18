(function (M) {
  'use strict';
  const SUITS = ['b','d','c'];
  const HONORS = ['we','ws','ww','wn','dr','dg','dw'];
  const STANDARD_TYPES = [...SUITS.flatMap(s => Array.from({length:9}, (_,i)=>s+(i+1))), ...HONORS];
  const SUIT_NAMES={b:'Bamboo', d:'Dots', c:'Characters'};
  const WIND_NAMES={we:'East wind',ws:'South wind',ww:'West wind',wn:'North wind'};
  const DRAGON_NAMES={dr:'Red dragon',dg:'Green dragon',dw:'White dragon'};
  const TITLES={...WIND_NAMES,...DRAGON_NAMES,j:'Joker'};
  const WIND_MARKS={we:'東',ws:'南',ww:'西',wn:'北'};
  const DRAGON_MARKS={dr:'中',dg:'發',dw:'白'};
  const FLOWERS=['Plum','Orchid','Chrysanthemum','Bamboo flower','Spring','Summer','Autumn','Winter'];
  let uid=0;
  function makeTile(type) { return {id:++uid,type}; }
  function name(type) {
    if (!type) return 'Unknown';
    if (type==='j') return 'Joker';
    if(type[0]==='f')return FLOWERS[Number(type.slice(1))-1]+' flower';
    if(TITLES[type])return TITLES[type];
    return (type.slice(1)||'')+' '+(SUIT_NAMES[type[0]]||'Tile');
  }
  function matchKey(type) {if(!type) return type; if(type[0]==='f')return +type.slice(1)<=4?'flower':'season';return type;}
  function tileset(variant='hk'){
    const types=STANDARD_TYPES.flatMap(type=>Array.from({length:4},()=>makeTile(type)));
    if(variant==='american'){for(let i=1;i<=8;i++)types.push(makeTile('f'+i));for(let i=0;i<8;i++)types.push(makeTile('j'));}
    if(variant==='solitaire'){for(let i=1;i<=8;i++)types.push(makeTile('f'+i));}
    return types;
  }
  function shuffle(arr, random=Math.random){ for(let i=arr.length-1;i>0;i--){let j=Math.floor(random()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];} return arr;}
  function count(hand,type){return hand.reduce((v,t)=>v+(t.type===type?1:0),0);}
  function countTypes(tiles){let out={}; for(let t of tiles)out[t.type]=(out[t.type]||0)+1;return out;}
  function sortHand(hand){ const order={b:0,d:1,c:2,we:3,ws:3,ww:3,wn:3,dr:4,dg:4,dw:4,f:5,j:6};
    return hand.sort((a,b)=>{
      const oa=order[a.type]??order[a.type[0]]??7,ob=order[b.type]??order[b.type[0]]??7;
      return oa-ob || a.type.localeCompare(b.type,undefined,{numeric:true}) || a.id-b.id;
    });
  }
  // Tile faces are semantic, self-contained SVG: one tile type always keeps its
  // identity in every theme. No external fonts, sprite servers, or images needed.
  const NUMERALS=['一','二','三','四','五','六','七','八','九'];
  const WIND_INDICES={we:'E',ws:'S',ww:'W',wn:'N'};
  const DRAGON_INDICES={dr:'R',dg:'G',dw:'Wh'};
  const FLOWER_MARKS=['✿','❀','❁','❃','✽','☀','❋','❄'];
  const FLOWER_CAPTIONS=['PLUM','ORCHID','MUM','BAMBOO','SPRING','SUMMER','AUTUMN','WINTER'];
  const DOT_POSITIONS={
    2:[[14,12],[34,34]],
    3:[[11,9],[24,23],[37,37]],
    4:[[15,11],[33,11],[15,35],[33,35]],
    5:[[13,11],[35,11],[24,23],[13,35],[35,35]],
    6:[[15,10],[33,10],[15,23],[33,23],[15,36],[33,36]],
    7:[[14,9],[34,9],[14,23],[24,23],[34,23],[14,37],[34,37]],
    8:[[14,7],[34,7],[14,18],[34,18],[14,29],[34,29],[14,40],[34,40]],
    9:[[11,10],[24,10],[37,10],[11,23],[24,23],[37,23],[11,36],[24,36],[37,36]]
  };
  function svgFace(content,className){return `<svg class="tile-art ${className}" viewBox="0 0 48 46" focusable="false" aria-hidden="true">${content}</svg>`;}
  function dotArt(n){
    if(n===1)return svgFace('<circle cx="24" cy="23" r="17" fill="none" stroke="var(--suit-green)" stroke-width="2"/><circle cx="24" cy="23" r="13" fill="var(--suit-blue)" stroke="var(--suit-red)" stroke-width="2"/><circle cx="24" cy="23" r="8" fill="var(--tile-face)"/><circle cx="24" cy="23" r="4" fill="var(--suit-red)"/><path d="M24 7v5M24 34v5M8 23h5M35 23h5" stroke="var(--suit-green)" stroke-width="2"/>','tile-art-dots');
    const dots=DOT_POSITIONS[n].map(([x,y],i)=>{
      const ink=(i===0||i===n-1)?'red':((i%3===1)?'blue':'green');
      return `<circle cx="${x}" cy="${y}" r="4.7" fill="var(--suit-${ink})" stroke="var(--tile-ink)" stroke-width=".65"/><circle cx="${x-1}" cy="${y-1}" r="1.7" fill="var(--tile-face)" opacity=".8"/>`;
    }).join('');
    return svgFace(dots,'tile-art-dots');
  }
  function birdArt(){
    return svgFace('<path d="M6 38q18-4 36 1" stroke="var(--tile-ink)" stroke-width="2" fill="none"/><path d="M19 24L7 11l8 23Z" fill="var(--suit-green)" stroke="var(--tile-ink)" stroke-width=".9"/><path d="M18 25q0-13 13-13 9 0 9 9l-6 6q-6 12-19 4Z" fill="var(--suit-blue)" stroke="var(--tile-ink)" stroke-width="1"/><path d="M21 25q7-10 15-5-2 12-12 10Z" fill="var(--suit-green)"/><path d="M29 13q2-10 8-5l1 8" fill="var(--suit-blue)" stroke="var(--tile-ink)" stroke-width="1"/><circle cx="36" cy="17" r="1.5" fill="var(--tile-ink)"/><path d="m39 19 6 3-6 2" fill="var(--suit-red)"/><path d="m23 35-2 5m9-5-1 5" stroke="var(--suit-red)" stroke-width="1.5"/><path d="M22 25q5-4 8 0" stroke="var(--tile-face)" stroke-width="1.8" fill="none"/>','tile-art-bird');
  }
  const BAM_ROWS={2:[2],3:[3],4:[2,2],5:[2,1,2],6:[3,3],7:[2,3,2],8:[3,2,3],9:[3,3,3]};
  function bambooArt(n){
    if(n===1)return birdArt();
    const rows=BAM_ROWS[n],rowGap=39/rows.length;
    const stalks=rows.map((count,row)=>{
      const spread=count===1?0:count===2?20:15;
      return Array.from({length:count},(_,col)=>{
        const x=24+(col-(count-1)/2)*spread,y=7+row*rowGap;
        const ink=(row+col)%4===0?'red':'green';
        return `<g transform="translate(${x} ${y})"><path d="M0 1v${Math.min(11,rowGap-2)}" stroke="var(--suit-${ink})" stroke-width="5" stroke-linecap="round"/><path d="M-4 4h8M-4 9h8" stroke="var(--tile-ink)" stroke-width=".8"/><path d="m-3 2-2-2m8 2 2-2" stroke="var(--suit-blue)" stroke-width="1"/></g>`;
      }).join('');
    }).join('');
    return svgFace(stalks,'tile-art-bamboo');
  }
  function tileMarkup(type){
    if(type==='j')return '<span class="tile-index">J</span><span class="tile-symbol joker-symbol">★</span><span class="tile-caption">JOKER</span>';
    if(type[0]==='f'){
      const i=+type.slice(1)-1;
      return `<span class="tile-index">${i<4?'F':'S'}${i%4+1}</span><span class="tile-symbol flower-symbol">${FLOWER_MARKS[i]}</span><span class="tile-caption">${FLOWER_CAPTIONS[i]}</span>`;
    }
    if(WIND_MARKS[type])return `<span class="tile-index">${WIND_INDICES[type]}</span><span class="tile-symbol wind-symbol">${WIND_MARKS[type]}</span><span class="tile-caption">${WIND_NAMES[type].split(' ')[0].toUpperCase()}</span>`;
    if(DRAGON_MARKS[type])return `<span class="tile-index">${DRAGON_INDICES[type]}</span>${type==='dw'?'<span class="tile-white-dragon" aria-hidden="true"><span></span></span>':`<span class="tile-symbol dragon-symbol ${type==='dg'?'green-dragon':''}">${DRAGON_MARKS[type]}</span>`}<span class="tile-caption">${DRAGON_NAMES[type].split(' ')[0].toUpperCase()} DR</span>`;
    const n=+type.slice(1),s=type[0];
    if(s==='d')return `<span class="tile-index">${n}</span>${dotArt(n)}<span class="tile-caption">DOTS</span>`;
    if(s==='b')return `<span class="tile-index">${n}</span>${bambooArt(n)}<span class="tile-caption">BAM</span>`;
    return `<span class="tile-index">${n}</span><span class="tile-characters"><span class="tile-character-num">${NUMERALS[n-1]}</span><span class="tile-character-wan">萬</span></span><span class="tile-caption">CRAK</span>`;
  }
  function tileButton(tile, opts={}) {
    const type=typeof tile==='string'?tile:tile.type;
    return '<button type="button" class="mj-tile '+(opts.className||'')+' '+(opts.selected?'is-selected':'')+' '+(opts.disabled?'is-disabled':'')+'" '+(opts.disabled?'disabled':'')+' '+(opts.attr||'')+' title="'+name(type)+'" aria-label="'+name(type)+'">'+tileMarkup(type)+'</button>';
  }
  function elapsed(seconds){return Math.floor(seconds/60).toString().padStart(2,'0')+':'+(seconds%60).toString().padStart(2,'0');}
  function setCountValid(tiles){return tiles.length===136||tiles.length===144||tiles.length===152;}
  M.core={SUITS,HONORS,STANDARD_TYPES, SUIT_NAMES,FLOWERS, tileset, makeTile, shuffle, count, countTypes, sortHand, name, matchKey, tileMarkup,tileButton,elapsed,setCountValid};
})(globalThis.Mahjong=globalThis.Mahjong||{});
