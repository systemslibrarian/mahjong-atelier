'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
for(const name of ['core','table','hongkong','american'])require('../js/'+name+'.js');
const M=globalThis.Mahjong;

function inventory(game){
 return [...game.wall,...game.players.flatMap(player=>[
  ...player.hand,...player.flowers,...player.discards,...player.melds.flatMap(meld=>meld.tiles)
 ])].map(tile=>tile.id).sort((a,b)=>a-b);
}

test('32 seeded hands conserve identities, logical hand sizes, and match scores across all profiles',t=>{
 const originalRandom=Math.random;
 let seed=0x1A7E1120;
 Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 let actions=0,hands=0;
 const scenarios=[
  {variant:'hk',hkProfile:'beginner',minFan:0},
  {variant:'hk',hkProfile:'atelier',flowers:false,minFan:0},
  {variant:'hk',hkProfile:'atelier',flowers:true,minFan:3},
  {variant:'american'}
 ];
 try{
  for(const settings of scenarios){
   let game=settings.variant==='american'?new M.AmericanTable(settings):new M.HongKongTable(settings);
   const firstAction=actions;
   for(let hand=0;hand<8;hand++){
    game.players.forEach(player=>player.bot=true);
    const identities=inventory(game);
    let steps=0;
    while(game.phase!=='finished'&&steps++<1500){
     for(const player of game.players){
      // Hong Kong Kongs occupy one three-tile meld slot; American exposures
      // keep their full physical size within a fourteen-tile winning hand.
      const count=player.hand.length+player.melds.reduce((sum,meld)=>sum+(game.variant==='hk'?3:meld.tiles.length),0);
      const hasExtra=['discard','robkong'].includes(game.phase)?player.seat===game.current
       :['opening','passingWin','charleston','secondChoice','courtesyChoice','blindDeadlock'].includes(game.phase)?player.seat===game.dealer
       :false;
      const context=JSON.stringify({variant:game.variant,profile:settings.hkProfile,phase:game.phase,seat:player.seat,current:game.current,hand,steps,source:game.lastSource});
      assert.equal(count,13+(hasExtra?1:0),context);
     }
     assert.ok(game.botStep(),'A bot must advance '+game.phase);
     assert.deepEqual(inventory(game),identities,'Every action preserves every physical tile exactly once');
     actions++;
    }
    assert.equal(game.phase,'finished','A hand must finish within the bounded action limit');
    assert.equal(game.scores.reduce((sum,score)=>sum+score,0),0,'Match scores stay zero-sum');
    hands++;
    game=game.nextHand();
    if(!game)break;
   }
   t.diagnostic(JSON.stringify({settings,actions:actions-firstAction}));
  }
  assert.equal(hands,32,'Each of the four profiles completes eight consecutive hands');
  // Action totals are evidence, not an invariant: bot decisions may change.
  t.diagnostic(`Seed 0x1A7E1120: ${hands} hands, ${actions} actions.`);
 }finally{
  Math.random=originalRandom;
 }
});
