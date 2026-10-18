
(function (M) {
  'use strict';
  const {tileset,shuffle,matchKey}=M.core;
  function coords(layout) {
    const out=[];
    function rect(z,startX,startY,width,height){for(let y=startY;y<startY+height;y++)for(let x=startX;x<startX+width;x++)out.push({id:`${z}-${x}-${y}`,x,y,z});}
    if(layout==='garden'){rect(0,0,0,12,8);rect(1,1,2,10,4);rect(2,4,3,4,2);}
    else if(layout==='bridge'){rect(0,0,1,14,6);rect(1,2,2,10,4);rect(2,3,3,8,2);rect(3,5,3,4,1);}
    else {rect(0,0,0,12,8);rect(1,2,2,8,4);rect(2,3,3,6,2);rect(3,5,3,2,2);}
    if(out.length!==144)throw new Error('Invalid board shape');
    return out;
  }
  function free(pos,occ) {
    if(!occ.has(pos.id))return false;
    const occVals = [...occ.values()];
    for(const n of occVals)if(n.z>pos.z && n.x===pos.x && n.y===pos.y)return false;
    const left=occVals.some(n=>n.z===pos.z&&n.y===pos.y&&n.x===pos.x-1);
    const right=occVals.some(n=>n.z===pos.z&&n.y===pos.y&&n.x===pos.x+1);
    return !left||!right;
  }
  function removalOrder(positions, random=Math.random){
    const occ=new Map(positions.map(p=>[p.id,p]));const out=[];
    while(occ.size){
      let avail=[...occ.values()].filter(p=>free(p,occ));
      if(avail.length<2)return null;
      // Clear the highest uncovered layer first, preserving strong progress toward an exit.
      avail.sort((a,b)=>b.z-a.z || random()-.5);
      const top=avail[0].z;
      const preferred=avail.filter(p=>p.z===top);
      let pair;
      if(preferred.length>=2)pair=shuffle(preferred.slice(),random).slice(0,2);
      else pair=[avail[0],shuffle(avail.slice(1),random)[0]];
      for(const p of pair)occ.delete(p.id);out.push(pair.map(p=>p.id));
    }
    return out;
  }
  function assignDeal(positions, tiles, random=Math.random) {
    let pairs=[];const groups=new Map();
    for(const t of tiles){let key=matchKey(t.type);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(t);}
    for(let g of groups.values()){
      shuffle(g,random); if(g.length%2)throw new Error('Unpaired solitaire tiles');
      for(let i=0;i<g.length;i+=2)pairs.push([g[i],g[i+1]]);
    }
    shuffle(pairs,random);
    let schedule=removalOrder(positions,random);
    if(!schedule||schedule.length!==pairs.length)throw new Error('Layout cannot be solved');
    let assigned=new Map();
    schedule.forEach((ids,i)=>ids.forEach((id,j)=>assigned.set(id,pairs[i][j])));
    return positions.map(p=>({...p,tile:assigned.get(p.id),removed:false}));
  }
  class Solitaire {
    constructor(layout='pyramid'){this.newGame(layout);}
    newGame(layout=this.layout){this.layout=layout;this.tiles=assignDeal(coords(layout),tileset('solitaire'));this.selected=null;this.moves=0;this.undoStack=[];this.hints=0;this.shuffles=0;this.finished=false;this.startedAt=Date.now();this.lastHint=[];this.reflowed=false;}
    occupied(){return new Map(this.tiles.filter(t=>!t.removed).map(t=>[t.id,t]));}
    available(){let occ=this.occupied();return this.tiles.filter(t=>free(t,occ));}
    freeId(id){const p=this.tiles.find(t=>t.id===id);return !!p && free(p,this.occupied());}
    pairs(){const arr=this.available(),out=[];for(let i=0;i<arr.length;i++)for(let j=i+1;j<arr.length;j++)if(matchKey(arr[i].tile.type)===matchKey(arr[j].tile.type))out.push([arr[i].id,arr[j].id]);return out;}
    choose(id){
      if(this.finished)return {action:'locked'};
      if(!this.freeId(id))return {action:'locked'};
      if(this.selected===id){this.selected=null;return {action:'deselect'};}
      if(!this.selected){this.selected=id;return {action:'select'};}
      const a=this.tiles.find(t=>t.id===this.selected),b=this.tiles.find(t=>t.id===id);
      if(matchKey(a.tile.type)!==matchKey(b.tile.type)){this.selected=id;return {action:'nomatch'};}
      a.removed=b.removed=true;this.undoStack.push([a.id,b.id]);this.moves++;this.selected=null;this.lastHint=[];
      if(this.remaining===0)this.finished=true;
      return {action:'match',completed:this.finished};
    }
    get remaining(){return this.tiles.filter(t=>!t.removed).length;}
    undo(){const pair=this.undoStack.pop();if(!pair)return false;pair.forEach(id=>this.tiles.find(t=>t.id===id).removed=false);this.moves=Math.max(0,this.moves-1);this.finished=false;this.selected=null;this.lastHint=[];return true;}
    hint(){let pairs=this.pairs();this.lastHint=pairs.length?pairs[Math.floor(Math.random()*pairs.length)]:[];if(pairs.length)this.hints++;return this.lastHint;}
    reshuffle(){
      const alive=this.tiles.filter(t=>!t.removed); if(alive.length<=1)return false;
      // Retain exact tile inventory while building a guaranteed legal solution order.
      let positions=alive.map(({id,x,y,z})=>({id,x,y,z}));
      let tiles=alive.map(t=>t.tile);
      let assigned;
      try { assigned=assignDeal(positions,tiles); }
      catch {
        // If the player leaves a structurally trapped stack (for example, two
        // tiles above/below each other), no tile permutation can rescue it.
        // Move all remaining tiles onto a flat rescue tray before redealing.
        positions=alive.map((t,i)=>({id:t.id,x:i%12,y:Math.floor(i/12),z:0}));
        assigned=assignDeal(positions,tiles);
        const byId=new Map(positions.map(p=>[p.id,p]));
        alive.forEach(t=>{const p=byId.get(t.id);t.x=p.x;t.y=p.y;t.z=p.z;});
        this.reflowed=true;
      }
      let byId=new Map(assigned.map(t=>[t.id,t.tile]));
      alive.forEach(t=>t.tile=byId.get(t.id));this.selected=null;this.lastHint=[];
      this.undoStack=[];this.shuffles++;return true;
    }
  }
  M.Solitaire=Solitaire;
  M.solitaireTest={coords,free,removalOrder,assignDeal};
})(globalThis.Mahjong=globalThis.Mahjong||{});

