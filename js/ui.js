
(function(M){
  'use strict';
  const C=M.core;
  const root=document.getElementById('app');
  // Choose the initial deal once. Rotating or resizing must never redeal it.
  const initialLayout=window.matchMedia('(max-width: 620px)').matches?'portrait':'pyramid';
  const state={mode:'solitaire',boardFocus:false,appearance:readAppearance(),showTileGuide:false,learning:false,teaching:readTeaching(),advice:[],adviceOpen:false,review:'',games:{solitaire:new M.Solitaire(initialLayout),hongkong:null,american:null},settings:{layout:initialLayout,opponents:'bots',secondCharleston:true,minFan:0,hkProfile:'atelier',flowers:true,sevenPairs:false},passSelected:new Set(),blind:0,selected:null,toast:'',curtain:null,lastSeat:-1,showGuide:true,goal:0,mute:false,stats:readStats()};
  let pumpTimer=null,toastTimer=null,timerInterval=null;
  const THEMES=[['ivory','Classic Ivory'],['minimal','Modern Minimal'],['neon','Neon Night'],['pastel','Cozy Pastel']];
  function readTeaching(){try{return localStorage.getItem('mahjong-atelier-teaching')!=='off';}catch{return true;}}
  function clearAdvice(){state.advice=[];state.adviceOpen=false;}
  function requestAdvice(){const g=currentGame();if(!g)return;if(state.mode==='solitaire')state.advice=M.coach.solitaireChoices(g).slice(0,3);else{const seat=g.who();if(g.isBotSeat(seat))return;const all=M.coach.alternatives(M.coach.publicView(g,seat));const chosen=all.find(a=>a.id===state.selected);state.advice=all.slice(0,3);if(chosen&&!state.advice.includes(chosen))state.advice[2]=chosen;}state.adviceOpen=true;}
  function coachPanel(){
    const g=currentGame();return `<section class="coach-panel" aria-label="Teaching mode"><div class="coach-heading"><label><input type="checkbox" data-teaching="true" ${state.teaching?'checked':''}> Teaching mode</label><small>Choose · understand · compare</small></div>${state.teaching?`<p><strong>Rule</strong> ${state.mode==='solitaire'?'Match identical free tiles (or two Flowers / two Seasons). A free tile is uncovered with an open horizontal side.':g?escapeHTML(M.coach.actionRule(g,g.who())):'Choose your rules profile, minimum, and opponents. Lessons and guided practice remain available before you start.'}</p>${state.review?`<p class="coach-review" role="status"><strong>After your move</strong> ${escapeHTML(state.review)}</p>`:''}${g&&(state.mode==='solitaire'||(!g.isBotSeat(g.who())&&g.phase==='discard'))?btn(state.adviceOpen?'Refresh comparison':'Hint · compare possible moves','coach-hint','secondary'):''}${state.adviceOpen?`<p class="coach-boundary">These are suggestions, not proven optimal moves. Advice uses your rack and public information only. Unseen copies may be in other hands, not necessarily in the wall. No future tiles are inspected.</p><div class="coach-alternatives">${state.advice.map((a,i)=>`<article><h4>${i===0?'Consider':'Alternative '+i}</h4>${state.mode==='solitaire'?`<button class="ui-btn secondary" data-act="coach-pair" data-pair="${a.ids.join(',')}">Highlight this pair</button>`:`<button class="ui-btn secondary" data-act="coach-select" data-id="${a.id}">Consider discarding ${escapeHTML(C.name(a.type))}</button>`}<p><strong>Calculation</strong> ${escapeHTML(a.calculation)}</p><p><strong>Heuristic</strong> ${escapeHTML(a.heuristic)}</p>${a.waits?.length?`<p><strong>Winning draw types</strong> ${a.waits.map(w=>escapeHTML(C.name(w.type))).join(', ')}</p>`:''}${a.defense?`<p><strong>Defense caution</strong> ${escapeHTML(a.defense)}</p>`:''}</article>`).join('')||'<p>No legal pair is currently available. Undo or Shuffle can help you continue.</p>'}</div>`:''}`:''}</section>`;
  }
  function readAppearance(){
    try{
      const saved=JSON.parse(localStorage.getItem('mahjong-atelier-appearance'))||{};
      return {theme:['ivory','minimal','neon','pastel'].includes(saved.theme)?saved.theme:'ivory',indices:saved.indices!==false};
    }catch{return {theme:'ivory',indices:true};}
  }
  function saveAppearance(){try{localStorage.setItem('mahjong-atelier-appearance',JSON.stringify(state.appearance));}catch{}}
  function readStats(){try{return JSON.parse(localStorage.getItem('mahjong-arcade-stats'))||{solitaire:0,hongkong:0,american:0};}catch{return {solitaire:0,hongkong:0,american:0};}}
  function saveWin(which){state.stats[which]=(state.stats[which]||0)+1;try{localStorage.setItem('mahjong-arcade-stats',JSON.stringify(state.stats));}catch{}}
  function clearToast(){clearTimeout(toastTimer);toastTimer=null;state.toast='';root.querySelector('.toast')?.remove();}
  function notify(text){clearToast();state.toast=text;toastTimer=setTimeout(clearToast,3500);}
  function pop(){if(!state.toast)return '';return '<div role="status" aria-live="polite" class="toast"><span class="toast-dot"></span>'+escapeHTML(state.toast)+'</div>';}
  function escapeHTML(s){return String(s).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
  function btn(text,action,variant='secondary',disabled=false,attrs=''){
    return `<button class="ui-btn ${variant}" type="button" data-act="${action}" ${disabled?'disabled':''} ${attrs}>${text}</button>`;
  }
  function currentGame(){return state.games[state.mode];}
  function switchMode(mode){
    clearTimeout(pumpTimer);pumpTimer=null;
    clearToast();
    clearAdvice();state.review='';state.mode=mode;state.boardFocus=false;state.blind=0;state.selected=null;state.passSelected.clear();state.curtain=null;state.lastSeat=-1;state.showTileGuide=false;
    document.title='Mahjong Atelier · '+({solitaire:'Solitaire',hongkong:'Hong Kong',american:'American'}[mode]);
    render();
  }
  function header(){
    const tabs=[['solitaire','layers','Solitaire'],['hongkong','users','Hong Kong'],['american','star','American']];
    return `<header class="masthead"><div class="identity"><div class="logo-tile" aria-hidden="true"><svg viewBox="0 0 300 400" focusable="false">${M.tileArt.dr}</svg></div><div><div class="brand-name">MAHJONG <em>ATELIER</em></div><div class="brand-sub">Three ways to make your move</div></div></div><div class="masthead-right"><span class="offline-pill"><span class="signal"></span> FREE TO PLAY</span>${btn('ⓘ &nbsp; How to play','learn','header-btn')}</div></header><nav class="game-nav" aria-label="Game mode">${tabs.map(([mode,ico,text])=>`<button type="button" class="game-tab ${state.mode===mode?'on':''}" data-act="switch" data-mode="${mode}" aria-current="${state.mode===mode?'page':'false'}"><span class="tab-icon">${mode==='solitaire'?'◈':mode==='hongkong'?'♟':'✦'}</span><span>${text}</span><span class="tab-suffix">${mode==='solitaire'?'01':mode==='hongkong'?'02':'03'}</span></button>`).join('')}</nav>`;
  }
  function appearanceBar(){
    return `<div class="appearance-bar" aria-label="Tile appearance"><div class="appearance-intro"><span class="appearance-sparkle">✧</span><span><strong>Find your tile style</strong><small>Same tiles, same rules. Just a different look.</small></span></div><div class="appearance-controls"><label class="appearance-picker" for="tile-style"><span>DESIGN</span><select id="tile-style" data-appearance="theme">${THEMES.map(([key,label])=>`<option value="${key}" ${state.appearance.theme===key?'selected':''}>${label}</option>`).join('')}</select></label><label class="indices-label"><input type="checkbox" data-appearance="indices" ${state.appearance.indices?'checked':''}/><span>English indices</span></label><button type="button" class="tile-help-trigger" data-act="tile-guide">◈ &nbsp; Learn the tiles</button></div></div>`;
  }
  function legendTile(type){return `<div class="legend-tile"><div class="mj-tile tile-example" role="img" aria-label="${C.name(type)}">${C.tileMarkup(type)}</div><span>${escapeHTML(C.name(type))}</span></div>`;}
  function tileGuide(){
    if(!state.showTileGuide)return '';
    const suits=[['Dots · 筒子','Copper-coin circles. Tile 1 is a larger, decorated circle.',['d1','d5','d9']],['Bamboo · 條子','Counting bamboo stalks, with a bird on the 1-Bamboo tile.',['b1','b5','b9']],['Characters · 萬子','Chinese numbers above the red character 萬 (ten thousand).',['c1','c5','c9']]];
    return `<div class="tile-help-overlay"><div class="tile-help-scrim" data-act="close-tile-guide"></div><div class="tile-help-panel" role="dialog" aria-modal="true" aria-labelledby="tile-help-title"><header class="tile-help-heading"><div><p class="eyebrow">THE TILE LIBRARY</p><h2 id="tile-help-title">Read the tiles at a glance.</h2><p>Every style keeps the same suit, number and tile meaning.</p></div><button type="button" class="tile-help-close" aria-label="Close tile guide" data-act="close-tile-guide">×</button></header><div class="legend-suits">${suits.map(([title,desc,types])=>`<section class="legend-group"><h3>${title}</h3><p>${desc}</p><div class="legend-tiles">${types.map(legendTile).join('')}</div></section>`).join('')}</div><section class="legend-special"><h3>The honors</h3><p>Winds and Dragons cannot form numbered sequences. Their symbols have fixed meanings.</p><div class="legend-tiles">${['we','ws','ww','wn','dr','dg','dw'].map(legendTile).join('')}</div></section><section class="legend-special"><h3>Flowers, Seasons &amp; Jokers</h3><div class="legend-tiles">${['f1','f5','j'].map(legendTile).join('')}</div><p>American practice adds eight Jokers and eight bonus tiles. Solitaire uses bonus tiles; Hong Kong uses 136 standard tiles, plus optional bonus tiles in the Atelier profile.</p></section><p class="legend-note">English indices are a learning aid. Hide them in the appearance bar whenever you want a more traditional challenge. The Mahjong rules do not change.</p></div></div>`;
  }
  function panelHeader(kicker,title,description){return `<div class="section-heading"><div><p class="eyebrow">${kicker}</p><h1>${title}</h1><p class="lede">${description}</p></div></div>`;}
  function rulesProfileMarkup(game=null){
    // A table keeps its own rules when setup choices change in another mode.
    const settings=game?game.settings:state.settings;
    const american=game?game.variant==='american':state.mode==='american';
    const expanded=!american&&(game?game.expanded:settings.hkProfile==='atelier');
    const profile=american?'american':expanded?'atelier':'beginner';
    const title=american?'American Practice v2':expanded?'Atelier Hong Kong v2':'Hong Kong Beginner';
    let details,note;
    if(american){
      details=[['card','Original practice card',M.americanTest.CARD.length+' patterns'],['tiles','Tile set','152 tiles'],['jokers','Jokers','Groups of 3+']];
      note='American mechanics practice with Atelier’s own card. Official annual-card hands are not included.';
    }else{
      const minimum=game?game.minFan:Number(settings.minFan||0);
      const flowers=expanded&&(game?game.flowersEnabled:settings.flowers!==false);
      const sevenPairs=expanded&&settings.sevenPairs===true;
      details=[['minimum','Minimum',minimum+' qualifying faan'],['flowers','Flowers / Seasons',flowers?'On':'Off'],['seven-pairs','Seven pairs',sevenPairs?'On':'Off']];
      note=expanded?'Atelier house profile. Flower bonuses do not count toward the minimum.':'Four melds and a pair, with simplified Hong Kong scoring.';
    }
    return `<section class="rules-profile" aria-label="${game?'Active rules':'Selected rules'}" data-rules-state="${game?'active':'setup'}" data-rules-profile="${profile}"><div class="rules-profile-heading"><span class="rules-profile-label">${game?'Rules at this table':'Rules for your new table'}</span><h2>${title}</h2></div><ul class="rules-profile-settings" aria-label="Rule settings">${details.map(([key,label,value])=>`<li data-rule="${key}"><span>${escapeHTML(label)}</span><strong>${escapeHTML(value)}</strong></li>`).join('')}</ul><p class="rules-profile-note">${note}</p></section>`;
  }
  function offlineAccessMarkup(){
    return location.protocol==='file:'?'This saved game file plays offline in your browser.':'<a class="offline-download" href="Mahjong_Atelier.html" download="Mahjong_Atelier.html">Download for offline play</a> · Save the file, then open it in your browser.';
  }
  function guide(mode){
    if(!state.showGuide)return '';
    if(mode==='solitaire')return `<aside class="guide-card"><div class="guide-kicker">THE FIELD GUIDE <span>01 / 03</span></div><h3>A quiet game of strategy.</h3><p>Find two matching <strong>free tiles</strong>. A tile is free when nothing rests directly on it and at least one horizontal side is open.</p><div class="tip-list"><div><span class="tip-icon">01</span><span><b>Work from the top</b><small>Peel away layers to reveal the tiles below.</small></span></div><div><span class="tip-icon">02</span><span><b>Plan your pairs</b><small>A match now can block a better match later.</small></span></div><div><span class="tip-icon">03</span><span><b>Rescue your run</b><small>Use Hint, Undo, or Shuffle when stuck; Shuffle can flatten a trapped stack.</small></span></div></div><div class="guide-note">Each new deal is built from at least one valid full-clearing sequence. Some choices can still lead to a dead end.</div></aside>`;
    if(mode==='hongkong')return `<aside class="guide-card"><div class="guide-kicker">THE FIELD GUIDE <span>02 / 03</span></div><h3>Build your winning hand.</h3><p>Work toward <strong>four melds and one pair</strong>. Each turn, draw and discard. Call an opponent's latest discard when eligible.</p><div class="tip-list"><div><span class="tip-icon">吃</span><span><b>Chow</b><small>Three consecutive numbers of one suit. Only from the player before you.</small></span></div><div><span class="tip-icon">碰</span><span><b>Pung / Kong</b><small>Three or four identical tiles; Kong draws a replacement.</small></span></div><div><span class="tip-icon">胡</span><span><b>Mahjong</b><small>A complete hand; declare it before discarding.</small></span></div></div><div class="guide-note">Choose Beginner or Atelier Hong Kong. Atelier adds special hands, added Kongs, optional Flowers, four wind rounds, and a visible points ledger. Open lessons for the exact house rules.</div></aside>`;
    return `<aside class="guide-card"><div class="guide-kicker">THE FIELD GUIDE <span>03 / 03</span></div><h3>Play the American way.</h3><p>Build a hand matching <strong>one complete line</strong> on the original practice card. This is not an official NMJL annual card.</p><div class="tip-list"><div><span class="tip-icon">↗</span><span><b>Charleston</b><small>Pass three non-Joker tiles: Right, Across, Left. A second round needs everyone’s agreement; courtesy passing follows.</small></span></div><div><span class="tip-icon">★</span><span><b>Jokers</b><small>Use in groups of three or more, never singles or pairs.</small></span></div><div><span class="tip-icon">↔</span><span><b>Joker exchange</b><small>Trade a natural tile for a matching Joker in any eligible exposed set on your turn.</small></span></div></div><div class="guide-note">Practice blind and courtesy passes, concealed hands, exposure compatibility, and Joker exchanges. Points belong to the original Atelier card; this is not NMJL annual-card play.</div></aside>`;
  }
  function solitaireView(){
    const g=currentGame(),positions=g.tiles,free=new Set(g.available().map(t=>t.id));
    const maxX=Math.max(...positions.map(p=>p.x)),maxY=Math.max(...positions.map(p=>p.y));
    const portrait=g.layout==='portrait';
    const inset=portrait?18:43;
    const width=portrait?36+(maxX+1)*55:Math.max(755,110+(maxX+1)*55);
    const height=(portrait?74:100)+(maxY+1)*69;
    const board=positions.filter(p=>!p.removed).sort((a,b)=>a.z-b.z).map(p=>{
      const enabled=free.has(p.id),tip=g.lastHint.includes(p.id),type=p.tile.type;
      return `<button type="button" title="${C.name(type)}${enabled?' · Free':' · Blocked'}" aria-label="${C.tileAccessibleName(type)}${enabled?' free':' blocked'}" ${enabled?'':'disabled'} data-act="sol-pick" data-tile-id="${p.id}" class="mj-tile board-tile layer-${p.z} ${enabled?'free':'blocked'} ${g.selected===p.id?'is-selected':''} ${tip?'is-hint':''}" style="left:${inset+p.x*55-p.z*4}px;top:${37+p.y*69-p.z*7}px;z-index:${5+p.z*3};">${C.tileMarkup(type)}</button>`;
    }).join('');
    return `<div class="solitaire-heading">${panelHeader('SOLO PLAY / MATCH & CLEAR','<span class="desktop-title">A little peace. A lot of possibilities.</span><span class="phone-title">Solitaire</span>','Match free tiles, uncover new paths, and clear the board at your own pace.')}${btn(state.boardFocus?'↙ Exit focus':'⛶ Focus board','board-focus','ghost',false,`aria-pressed="${state.boardFocus}"`)}</div>
    <div class="stats-grid"><div class="stat"><span>Tiles left</span><strong>${g.remaining}<small> / 144</small></strong></div><div class="stat"><span>Pairs matched</span><strong>${g.moves}</strong></div><div class="stat"><span>Time</span><strong data-timer>${C.elapsed(Math.floor((Date.now()-g.startedAt)/1000))}</strong></div><div class="stat"><span>Best moments</span><strong>${state.stats.solitaire||0}<small> clears</small></strong></div></div>
    <div class="solitaire-settings"><div class="layout-prompt">BOARD SHAPE <span class="bullet">•</span> <span class="muted">Choose your challenge</span></div><div class="segment" role="group" aria-label="Puzzle layout (starts a new game)">${['portrait','pyramid','garden','bridge'].map(l=>`<button data-act="layout" data-layout="${l}" class="${g.layout===l?'active':''}" aria-pressed="${g.layout===l}" type="button">${({portrait:'Portrait',pyramid:'Pyramid',garden:'Garden',bridge:'Bridge'})[l]}</button>`).join('')}</div></div>
    <div class="board-frame"><div class="board-topline"><span>✧ &nbsp; ${g.reflowed?'RESCUE TRAY':g.layout.toUpperCase()} <span class="board-subtitle">/ LAYERED PUZZLE</span></span><span>${g.pairs().length} PAIRS AVAILABLE</span></div><div class="board-scroller"><div class="solitaire-stage" data-board-width="${width}" data-board-height="${height}" style="width:${width}px;height:${height}px"><div class="solitaire-board" role="group" aria-label="Mahjong Solitaire board" style="width:${width}px;height:${height}px">${board}</div></div></div>${g.finished?'<div class="board-overlay"><div class="winning-medal">✦</div><h2>Beautifully played.</h2><p>You cleared every tile!</p>'+btn('Play again','new-sol','primary')+'</div>':''}${!g.finished&&g.pairs().length===0?'<div class="no-moves" role="status">No matching free pairs. Try Undo or Shuffle to continue.</div>':''}</div>
    <div class="toolbar solitaire-toolbar" role="group" aria-label="Puzzle controls">${btn('<span aria-hidden="true">↶</span> Undo','undo','secondary',!g.undoStack.length)}${btn('<span aria-hidden="true">◌</span> Hint','hint','secondary',g.finished)}${btn('<span aria-hidden="true">⤨</span> Shuffle','shuffle','secondary',g.finished)}<span class="toolbar-divider"></span>${btn('<span aria-hidden="true">✧</span> New<span class="desktop-title"> puzzle</span>','new-sol','primary',false,'aria-label="New puzzle"')}</div><p class="board-touch-tip">Pinch to zoom in on the tiles. Focus board gives you more room to play.</p>`;
  }
  function setupView(){
    const isAm=state.mode==='american';
    return `${panelHeader(isAm?'FOUR-PLAYER / AMERICAN RULES':'FOUR-PLAYER / HONG KONG PROFILES',isAm?'The Charleston is calling.':'Gather around the table.',isAm?'An American-style practice game with original card patterns, Jokers and tile passing.':'Build sets, call discards and race to Mahjong under your selected Hong Kong rules profile.')}${rulesProfileMarkup()}
    <div class="setup-area"><div class="setup-top"><div class="setup-emblem">${isAm?'★':'中'}</div><h2>Set the table</h2><p>Choose how you want to play. Your table runs entirely in this browser.</p></div><h3 class="setup-label">PLAY AGAINST</h3><div class="opponent-grid"><button type="button" data-act="opponents" data-value="bots" class="opponent ${state.settings.opponents==='bots'?'chosen':''}"><span class="opponent-pict">◉ ◉ ◉</span><b>You + three bots</b><small>Play on your own against computer seats</small></button><button type="button" data-act="opponents" data-value="local" class="opponent ${state.settings.opponents==='local'?'chosen':''}"><span class="opponent-pict">♟ ♟ ♟ ♟</span><b>Four players, one device</b><small>Pass the device and keep hands hidden</small></button></div>
    ${isAm?`<div class="setup-field"><label for="second-pass">Computer preference for a second Charleston</label><select id="second-pass" data-setting="secondCharleston"><option value="true" ${state.settings.secondCharleston?'selected':''}>Bots agree to a second round</option><option value="false" ${!state.settings.secondCharleston?'selected':''}>Bots decline a second round</option></select><small>Each human chooses after the first round. One “stop” ends the Charleston. Courtesy offers are then negotiated across the table.</small></div>`:`<div class="setup-field"><label for="hk-profile">Rules profile</label><select id="hk-profile" data-setting="hkProfile"><option value="atelier" ${state.settings.hkProfile==='atelier'?'selected':''}>Atelier Hong Kong · expanded play</option><option value="beginner" ${state.settings.hkProfile==='beginner'?'selected':''}>Beginner · four melds + pair</option></select><small>Atelier uses a named house profile with special hands, added/robbed Kongs, a 10-faan cap, and four wind rounds.</small></div><div class="setup-field"><label for="fan-rule">Minimum qualifying faan</label><select id="fan-rule" data-setting="minFan"><option value="0" ${!state.settings.minFan?'selected':''}>0 · learn hand shapes</option><option value="3" ${state.settings.minFan===3?'selected':''}>3 · scoring challenge</option></select><small>In Atelier, Flower bonuses do not satisfy the minimum.</small></div>${state.settings.hkProfile==='atelier'?`<div class="setup-field"><label><input type="checkbox" data-setting="flowers" ${state.settings.flowers?'checked':''}> Include eight Flowers and Seasons</label><label><input type="checkbox" data-setting="sevenPairs" ${state.settings.sevenPairs?'checked':''}> Allow seven distinct pairs (4-faan house option)</label></div>`:''}`}

    ${btn('Start a new table &nbsp; →','start-table','primary')}<p class="setup-note">✦ &nbsp; No sign-in · No server · No tracking · No bets</p></div>`;
  }
  function publicTilesMarkup(tiles,label){
    return `<div class="public-tiles" role="group" aria-label="${escapeHTML(label)}">${tiles.map(t=>`<span class="mj-tile public-tile" role="img" aria-label="${escapeHTML(C.name(t.type))}" title="${escapeHTML(C.name(t.type))}">${C.tileMarkup(t.type)}</span>`).join('')}</div>`;
  }
  function seatMarkup(p,seat,active,game){
    const special=p.seat===active?' active':'';
    const viewer=game.settings.opponents==='local'?(state.curtain===null?active:null):game.players.find(p=>!p.bot)?.seat;
    const exposed=p.melds.length?`<div class="seat-melds">${p.melds.map((m,i)=>{
      if(m.concealed&&seat!==viewer&&!(game.phase==='finished'&&game.winner===seat))return '<div class="exposed-meld">▣ CONCEALED KONG · four face-down tiles</div>';
      const jokers=m.tiles.filter(t=>t.type==='j').length;
      const composition=game.variant==='american'?`${m.tiles.length-jokers} natural · ${jokers} Joker${jokers===1?'':'s'}`:`${m.tiles.length} tiles`;
      const canExchange=jokers&&game.variant==='american'&&game.phase==='discard'&&['draw','claim','exchange'].includes(game.lastSource)&&!game.players[game.current].bot&&game.players[game.current].hand.some(t=>t.type===m.type);
      return `<div title="${escapeHTML(m.kind+' · '+C.name(m.type))}" class="exposed-meld"><div><span class="meld-icon">${m.kind==='chow'?'≋':m.kind==='kong'?'▣':'◈'}</span> ${m.concealed?'CONCEALED ':''}${escapeHTML(m.kind.toUpperCase())} <strong>${escapeHTML(C.name(m.type))}</strong></div>${publicTilesMarkup(m.tiles,m.concealed?'Your concealed Kong':'Exposed '+m.kind)}<span class="meld-composition">${composition}</span>${canExchange?`<button type="button" class="swap-btn" data-act="joker-swap" data-seat="${seat}" data-meld="${i}" title="Exchange matching tile for exposed Joker">↔ Joker</button>`:''}</div>`;
    }).join('')}</div>`:'<span class="seat-meta">No exposed sets</span>';
    const flowers=p.flowers.length?`<div class="seat-flowers"><span>Exposed Flowers / Seasons</span>${publicTilesMarkup(p.flowers,'Exposed Flowers and Seasons')}</div>`:'';
    return `<div class="seat seat-${seat}${special}"><div class="seat-heading"><span class="wind-chip">${['東','南','西','北'][game.windIndex(seat)]}</span><span><strong>${p.name} · ${game.windName(seat)}</strong><small>${p.bot?'BOT':'LOCAL PLAYER'}</small></span>${p.seat===active?'<span class="turn-pin">● TURN</span>':''}</div><div class="seat-tiles"><span>▥ ${p.hand.length} concealed</span><span>◫ ${p.discards.length} discards</span><span>✿ ${p.flowers.length} bonus tiles</span></div>${exposed}${flowers}</div>`;
  }
  function compactTile(type){
    const t={'we':'東','ws':'南','ww':'西','wn':'北','dr':'中','dg':'發','dw':'白','j':'★'};
    if(type[0]==='f')return '✿';if(t[type])return t[type];return type.slice(1)+({b:'竹',d:'●',c:'萬'}[type[0]]||'');
  }
  function pondMarkup(g){
    const thrown=[];
    for(let p of g.players)for(let d of p.discards)thrown.push({tile:d,player:p.seat});
    return `<div class="pond-head"><span>THE DISCARD POND</span><span>${g.wall.length} TILES IN THE WALL</span></div><div class="pond-tiles">${thrown.map(x=>`<span role="img" aria-label="${g.players[x.player].name}: ${C.name(x.tile.type)}" class="pond-tile ${g.lastDiscard?.tile.id===x.tile.id?'newest':''}" title="${g.players[x.player].name}: ${C.name(x.tile.type)}">${compactTile(x.tile.type)}</span>`).join('')||'<span class="pond-empty">The tiles have not yet begun to fall.</span>'}</div>`;
  }
  function handMarkup(g,active){
    const p=g.players[active];
    if(g.settings.opponents==='local'&&state.curtain!==null)return '<div class="hand-panel"><p>The private rack stays hidden until its player reveals it.</p></div>';
    if(p.bot&&!(g.phase==='finished'&&g.winner===active))return '<div class="hand-panel"><p>Computer rack is concealed. Your rack returns when it is your turn.</p></div>';
    const playable=!p.bot&&(g.phase==='discard'||g.phase==='charleston');
    if(!p)return '';
    const tiles=p.hand.map(t=>`${C.tileButton(t,{selected:(g.phase==='charleston'?state.passSelected.has(t.id):state.selected===t.id),disabled:!playable,attr:playable?`data-act="hand-pick" data-id="${t.id}"`:''})}`).join('');
    return `<div class="hand-panel"><div class="hand-title"><div><span class="eyebrow">${['charleston','secondChoice','courtesyChoice'].includes(g.phase)?'THE PASSING RACK':'CONCEALED TILES'}</span><h3>${p.name}'s hand <span>· ${p.hand.length} tiles</span></h3></div><span class="rack-symbol">${g.variant==='american'?'AMERICAN RACK':'TABLE HAND'}</span></div><div class="rack" role="group" aria-label="${p.name} player's tiles">${tiles}</div><div class="rack-hint">← Swipe or scroll the rack to see all your tiles →</div></div>`;
  }
  function cardMarkup(g){if(state.mode!=='american')return '';
    return `<div class="practice-card"><div class="practice-header"><div><p class="eyebrow">AMERICAN EDITION · ORIGINAL CONTENT</p><h3>The Atelier Practice Card</h3></div><span>6 PATTERNS</span></div><p>Complete <strong>any one entire row</strong> to declare Mah Jongg. The highlighted target is a planning aid, not a restriction.</p><div class="pattern-list">${M.americanTest.CARD.map((c,i)=>`<button type="button" data-act="goal" data-goal="${i}" class="pattern ${state.goal===i?'goal':''}"><span class="pattern-name">${escapeHTML(c.name)}<small>${c.level}</small></span><span class="pattern-blocks">${c.groups.map(n=>`<b class="pattern-group ${n<=2?'singles':''}">${n===1?'F':n}</b>`).join('')}</span><span class="pattern-desc">${escapeHTML(c.description)}</span></button>`).join('')}</div><p class="practice-disclaimer">Each number is a group size; F means a single Flower or Season. Only Bloom Festival uses Flowers/Seasons, as its two singles. All other groups use numbered suits, Winds, or Dragons. Concealed rows allow no exposed sets before the winning call. Groups of 3+ are identical tiles; a Joker can fill these groups, never a pair or single. <strong>Unofficial original learning patterns</strong>, not NMJL annual-card hands.</p></div>`;
  }
  function actionMarkup(g,active){
    if(g.phase==='finished')return `<div class="action-banner result-banner"><div><h3>${g.result.kind==='win'?g.result.message:'A peaceful draw.'}</h3><p>${g.result.kind==='win'?(g.variant==='hk'?`${g.result.analysis.fan} faan · ${g.result.analysis.details.join(' · ')||'Standard hand'}`:`${g.result.analysis.card.name} · ${g.result.analysis.card.value} base points${g.result.analysis.jokerFree?' · Joker-free ×2':''}`):g.result.message}</p><p>Practice points only. ${g.result.kind==='win'?`Each opponent pays ${g.result.base}; ${g.result.selfDraw?'all three pay double for self-draw':'the discarder pays double'}.`:''}</p></div>${btn('Next hand · keep scores →','next-hand','primary')}${btn('New match','new-table','secondary')}</div>`;
    if(g.phase==='opening'||g.phase==='passingWin')return `<div class="action-banner"><div><p class="eyebrow">EAST’S ${g.phase==='opening'?'DEALT RACK':'COMPLETED PASSING ROUND'}</p><h3>${g.canDeclareWin(active)?'A complete original-card hand.':'Check your rack before passing.'}</h3><p>${g.phase==='opening'?'East may win with the dealt hand before any Charleston. Otherwise, begin the three required passes.':'East may declare at this completed round boundary. A started three-pass round must finish first.'}</p></div><div class="action-buttons">${g.canDeclareWin(active)?btn('Declare opening Mah Jongg','win','highlight',g.players[active].bot):''}${g.phase==='opening'?btn('Begin Charleston →','begin-charleston','primary',g.players[active].bot||!!g.canDeclareWin(active)):btn('Continue passing','continue-passing','secondary',g.players[active].bot)}</div></div>`;
    if(g.phase==='blindDeadlock')return `<div class="action-banner"><div><h3>No incoming tiles exist to pass blind.</h3><p>Everyone kept their entire rack. Rechoose this first-left pass with at least one rack tile contributed to start forwarding. Nobody’s tiles have moved.</p></div>${btn('Rechoose this pass','retry-blind','primary')}</div>`;
    if(g.phase==='secondChoice')return `<div class="action-banner"><div class="action-copy"><p class="eyebrow">CHARLESTON DECISION · ${g.players[active].name}</p><h3>Continue with a second round?</h3><p>Everyone must agree. One stop takes the table to courtesy offers.</p></div><div class="action-buttons">${btn('Continue · Left, Across, Right','second-yes','primary',g.players[active].bot)}${btn('Stop after first round','second-no','secondary',g.players[active].bot)}</div></div>`;
    if(g.phase==='courtesyChoice')return `<div class="action-banner"><div class="action-copy"><p class="eyebrow">COURTESY OFFER · ${g.players[active].name}</p><h3>How many tiles would you exchange?</h3><p>You and the opposite player exchange the smaller offer. Choose zero to decline. No blind tiles or Jokers.</p></div><div class="action-buttons">${[0,1,2,3].map(n=>btn(String(n),'courtesy-offer','secondary',g.players[active].bot,`data-count="${n}"`)).join('')}</div></div>`;
    if(g.phase==='charleston'){
      const r=g.passRoute[g.charIndex],required=g.passCount(active)-state.blind;
      return `<div class="action-banner"><div class="action-copy"><div class="eyebrow">${r.courtesy?'COURTESY EXCHANGE':`CHARLESTON · PASS ${g.charIndex+1}`}</div><h3>Pass ${g.passCount(active)} tiles ${r.name.toLowerCase()}</h3><p>Select ${required} non-Joker tiles from ${g.players[active].name}'s rack.${state.blind?` The remaining ${state.blind} will be forwarded unseen from the incoming packet.`:''}</p>${g.canBlind()&&!g.players[active].bot?`<label class="blind-choice">Pass unseen: <select data-blind="true" aria-label="Number of incoming tiles to pass blind">${[0,1,2,3].map(n=>`<option value="${n}" ${state.blind===n?'selected':''}>${n} blind tile${n===1?'':'s'}</option>`).join('')}</select></label><p>If everyone keeps all their rack tiles: first left needs a new selection; final right ends passing immediately, with no courtesy pass.</p>`:''}</div><div class="action-buttons"><span class="counter-note">${state.passSelected.size}/${required} selected</span>${btn('Send passing packet →','submit-pass','primary',g.players[active].bot||state.passSelected.size!==required)}</div></div>`;
    }
    if(g.phase==='claims'||g.phase==='robkong'){
      const opts=g.offered().options;
      return `<div class="action-banner"><div class="action-copy"><div class="eyebrow">DISCARD CLAIM · ${g.players[active].name.toUpperCase()}</div><h3>${g.phase==='robkong'?'Added Kong offered:':'Someone played'} ${C.name(g.phase==='robkong'?g.pendingKong.tile.type:g.lastDiscard.tile.type)}.</h3><p>${g.phase==='robkong'?'Only a winning hand can take this tile. Passing lets the Kong receive its replacement draw.':'Claim a legal exposed set or a complete winning hand—or pass to continue.'}</p></div><div class="action-buttons claim-actions">${g.players[active].bot?'<span class="muted">Thinking…</span>':opts.map(o=>btn(o.kind==='win'?'✦ '+o.title:escapeHTML(o.title),'claim','secondary',false,`data-code="${o.code}"`)).join('')+btn('Pass','claim','ghost',false,'data-code="pass"')}</div></div>`;
    }
    const p=g.players[active],canWin=g.canDeclareWin(active),kongs=g.kongOptions?g.kongOptions(active):[];
    return `<div class="action-banner"><div class="action-copy"><div class="eyebrow">YOUR MOVE · ${p.name.toUpperCase()}</div><h3>${p.bot?'Computer is choosing a tile…':'Choose a tile to discard.'}</h3><p>${g.variant==='hk'?'Build a complete hand under your selected profile. Added Kongs may be robbed for a win.':'Only hands on the practice card win. You can redeem Jokers from exposed groups on your turn.'}</p></div><div class="action-buttons">${canWin?btn('✦ &nbsp; Declare Mahjong!','win','highlight',p.bot):''}${kongs.map(type=>btn((type.startsWith('add:')?'▣ Add to Pung · ':'▣ Concealed Kong · ')+escapeHTML(C.name(type.replace('add:',''))),'kong','secondary',p.bot,`data-type="${type}"`)).join('')}${btn('Discard '+(state.selected===null?'selected tile':'tile →'),'discard','primary',p.bot||state.selected===null)}</div></div>`;
  }
  function adjustmentMarkup(g,active){
    if(g.variant!=='american'||g.isBotSeat(active))return '';const options=g.adjustmentOptions(active);if(!options.length)return '';
    return `<details class="exposure-adjust"><summary>Adjust your newly called exposure</summary><p>Keep the claimed tile and its identity. You may change this new set’s size or natural/Joker mixture while it still fits an exposed practice row. Discarding or exchanging a Joker locks the exposure.</p><div class="path-options">${options.map(o=>btn(`${o.size} tiles · ${o.natural} natural + ${o.jokers} Jokers`,'adjust-exposure','secondary',false,`data-ids="${o.ids.join(',')}"`)).join('')}</div></details>`;
  }
  function scoreboard(g){return `<section class="match-ledger" aria-label="Match scores"><p><strong>${g.variant==='hk'?(g.expanded?'Atelier Hong Kong':'Beginner Hong Kong'):'Atelier American'}</strong> · ${g.variant==='hk'?['East','South','West','North'][g.round]+' round':'Round '+(g.round+1)} · Hand ${g.handNumber} · Dealer: ${g.players[g.dealer].name}</p><div>${g.players.map((p,i)=>`<span>${p.name} (${g.windName(i)}) <strong>${g.scores[i]}</strong>${g.result?` <small>(${g.result.payments[i]>=0?'+':''}${g.result.payments[i]})</small>`:''}</span>`).join('')}</div><small>Virtual practice points · ${g.variant==='hk'?'East repeats after winning or a draw; otherwise the dealer moves.':'Dealer moves after every hand; after four hands, the initial dealer swaps seats to the right and starts the next round.'} ${g.variant==='hk'?'Four dealer advances change the prevailing wind.':'American round numbers do not add wind-scoring bonuses.'}</small></section>`;}
  function tableView(){
    const g=currentGame();if(!g)return setupView();
    const active=g.who()??g.current;
    const subtitle=state.mode==='american'?'An original card, a little luck, and a whole lot of strategy.':'Chows, Pungs and Kongs. Every discarded tile tells a story.';
    const title=state.mode==='american'?'A distinctly American table.':'Every tile has a story.';
    return `${panelHeader((g.variant==='hk'?(g.expanded?'ATELIER HONG KONG v2':'HONG KONG BEGINNER'):'AMERICAN PRACTICE')+' / FOUR PLAYERS',title,subtitle)}${rulesProfileMarkup(g)}
      <div class="stats-grid table-stats"><div class="stat"><span>Remaining wall</span><strong>${g.wall.length}</strong></div><div class="stat"><span>Round status</span><strong class="stat-status">${['charleston','secondChoice','courtesyChoice'].includes(g.phase)?'Passing':['claims','robkong'].includes(g.phase)?'Claims open':g.phase==='finished'?'Hand ended':'In play'}</strong></div><div class="stat"><span>Active seat</span><strong>${g.windName(active)}</strong></div><div class="stat"><span>Completed games</span><strong>${state.stats[state.mode]||0}</strong></div></div>
      ${scoreboard(g)}<div class="arena"><div class="arena-label"><span>✦ THE FELT TABLE</span><span>${g.settings.opponents==='bots'?'SOLO VS. THREE BOTS':'FOUR LOCAL PLAYERS'}</span></div><div class="arena-grid"><div class="arena-seat-top">${seatMarkup(g.players[2],2,active,g)}</div><div class="arena-seat-left">${seatMarkup(g.players[3],3,active,g)}</div><div class="discard-pond">${pondMarkup(g)}</div><div class="arena-seat-right">${seatMarkup(g.players[1],1,active,g)}</div><div class="arena-seat-bottom">${seatMarkup(g.players[0],0,active,g)}</div></div></div>
      ${actionMarkup(g,active)}${handMarkup(g,active)}${adjustmentMarkup(g,active)}
      <div class="table-footer">${btn('↻ &nbsp; New hand','new-table','secondary')}${btn('⚙ &nbsp; Change table settings','change-settings','secondary')}<span class="muted">${escapeHTML(g.log[0]||'')}</span></div>${cardMarkup(g)}
      <div class="turn-history"><h3>Table notes</h3><ol>${g.log.slice(0,7).map(t=>`<li>${escapeHTML(t)}</li>`).join('')}</ol></div>`;
  }
  function privacyCurtain(){
    if(state.curtain===null)return '';
    const p=currentGame()?.players[state.curtain];if(!p)return '';
    return `<div class="curtain" role="dialog" aria-modal="true" aria-label="Private hand handoff"><div class="curtain-content"><div class="curtain-lock">♧</div><p class="eyebrow">PRIVATE HAND · ONE DEVICE</p><h2>Pass to ${p.name}.</h2><p>Other players, please look away. Only ${p.name} should see the next rack or discard opportunity.</p>${btn('I am '+p.name+' · Reveal my hand →','reveal','primary')}</div></div>`;
  }
  function render(){
    const which=state.mode;
    maybeGuard();
    root.innerHTML=`<div class="shell${state.boardFocus?' board-focus':''}" data-mode="${which}" ${state.curtain!==null?'inert aria-hidden="true"':''} data-tile-theme="${state.appearance.theme}" data-indices="${state.appearance.indices?'show':'hide'}">${header()}${appearanceBar()}<div class="learn-entry"><p><strong>Learn ${M.lessons[which].name}</strong><br>Choose a move. See why it helps. Compare alternatives—and discover what changes under another variant.</p><div class="learn-entry-actions">${btn('Start learning path →','path','primary')}${btn('Guided practice','practice','secondary')}${btn('Rule library','learn','ghost')}</div></div><main class="content-grid"><section class="game-main">${which==='solitaire'?solitaireView():tableView()}${coachPanel()}</section>${guide(which)}</main><footer class="footer"><span>◈ &nbsp; MAHJONG ATELIER</span><span>${offlineAccessMarkup()}</span><span>NO ACCOUNTS · NO ADS</span></footer>${tileGuide()}</div>${pop()}${privacyCurtain()}`;
    if(state.curtain!==null)root.querySelector('[data-act="reveal"]')?.focus();
    fitSolitaireBoard();
    schedulePump();
  }
  function fitSolitaireBoard(){
    const stage=root.querySelector('.solitaire-stage');
    if(!stage)return;
    const board=stage.querySelector('.solitaire-board');
    const scroller=stage.closest('.board-scroller');
    const originalWidth=Number(stage.dataset.boardWidth)||board.offsetWidth;
    const originalHeight=Number(stage.dataset.boardHeight)||board.offsetHeight;
    const viewportWidth=Math.min(window.innerWidth||Infinity,document.documentElement.clientWidth||Infinity);
    const available=Math.max(0,Math.min(scroller.clientWidth,viewportWidth)-4);
    let scale=available?Math.min(1,available/originalWidth):1;
    if(state.boardFocus){
      const chrome=['.solitaire-heading','.stats-grid','.board-topline','.solitaire-toolbar']
        .reduce((total,selector)=>total+(root.querySelector(selector)?.offsetHeight||0),48);
      // Fit a focused portrait board vertically when possible, but keep tiles
      // legible on short screens; normal page scrolling remains available.
      scale=Math.min(scale,Math.max(44/54,(window.innerHeight-chrome)/originalHeight));
    }
    board.style.transformOrigin='top left';
    board.style.transform=`scale(${scale})`;
    stage.style.width=`${Math.ceil(originalWidth*scale)}px`;
    stage.style.height=`${Math.ceil(originalHeight*scale)}px`;
    stage.dataset.scale=scale.toFixed(3);
    scroller.classList.toggle('is-fitted',scale<0.999);
  }
  function activeHumanSeat(){
    if(state.mode==='solitaire')return null;
    const g=currentGame();if(!g||g.phase==='finished')return null;
    const seat=g.who();return !g.isBotSeat(seat)?seat:null;
  }
  function maybeGuard(){
    const g=currentGame();if(state.mode==='solitaire'||!g?.settings||g.settings.opponents!=='local'||g.phase==='finished'||state.curtain!==null)return;
    const seat=activeHumanSeat();if(seat!==null&&seat!==state.lastSeat){state.curtain=seat;clearAdvice();state.review='';state.selected=null;state.passSelected.clear();state.blind=0;}
  }
  function schedulePump(){
    clearTimeout(pumpTimer);pumpTimer=null;
    if(state.learning||state.mode==='solitaire'||state.curtain!==null)return;
    const g=currentGame();if(!g||g.phase==='finished')return;
    if(g.isBotSeat(g.who()))pumpTimer=setTimeout(()=>{
      try{if(g.botStep()){
        if(g.phase==='finished'&&g.result.kind==='win')saveWin(state.mode);
        state.selected=null;state.passSelected.clear();state.blind=0;render();
      }}catch(err){notify('A table action could not complete: '+err.message);render();}
    },270);
  }
  root.addEventListener('click',e=>{
    const control=e.target.closest('[data-act]');if(!control)return;
    const act=control.dataset.act;
    try{
      if(act==='coach-hint'){requestAdvice();render();root.querySelector('.coach-panel')?.scrollIntoView({block:'nearest'});return;}
      if(act==='coach-select'){state.selected=Number(control.dataset.id);render();root.querySelector('.rack .is-selected')?.focus();return;}
      if(act==='coach-pair'){currentGame().lastHint=control.dataset.pair.split(',');render();return;}
      if(act==='path'){state.learning=true;clearTimeout(pumpTimer);M.openPath(state.mode,()=>{state.learning=false;schedulePump();control.focus();});return;}
      if(act==='practice'){state.learning=true;clearTimeout(pumpTimer);M.openPractice(state.mode,()=>{state.learning=false;schedulePump();control.focus();});return;}
      if(act==='learn'){state.learning=true;clearTimeout(pumpTimer);M.openLessons(state.mode,()=>{state.learning=false;schedulePump();control.focus();});return;}
      if(act==='switch'){switchMode(control.dataset.mode);return;}
      if(act==='board-focus'){
        state.boardFocus=!state.boardFocus;
        render();
        root.querySelector('[data-act="board-focus"]')?.focus({preventScroll:true});
        root.querySelector('.solitaire-heading')?.scrollIntoView({block:'start',behavior:'instant'});
        return;
      }
      if(act==='toggle-guide'){state.showGuide=!state.showGuide;render();return;}
      if(act==='tile-guide'){state.showTileGuide=true;render();root.querySelector('.tile-help-close')?.focus();return;}
      if(act==='close-tile-guide'){state.showTileGuide=false;render();root.querySelector('[data-act=tile-guide]')?.focus();return;}
      if(act==='layout'){clearToast();clearAdvice();state.review='';state.games.solitaire.newGame(control.dataset.layout);render();return;}
      if(act==='sol-pick'){
        const g=state.games.solitaire,before=g.available().map(t=>t.id),action=g.choose(control.dataset.tileId);
        // Feedback describes this comparison, never a pair that already ended.
        if(action.action!=='locked')clearToast();
        if(state.teaching&&action.action==='match'){const n=g.available().filter(t=>!before.includes(t.id)).length;state.review=`Legal pair removed; ${n} previously blocked tile${n===1?' is':'s are'} now free. Look at those new choices before taking another pair.`;clearAdvice();}
        if(action.action==='match'&&action.completed){g.finishedSeconds=Math.floor((Date.now()-g.startedAt)/1000);saveWin('solitaire');notify('You cleared the board!');}
        if(action.action==='nomatch')notify('Those tiles do not match. Try another pair.');render();return;
      }
      if(act==='new-sol'){clearToast();clearAdvice();state.review='';state.games.solitaire.newGame();render();return;}
      if(act==='undo'){clearAdvice();state.review='The previous pair has been restored. Compare another choice.';if(state.games.solitaire.undo())notify('The last pair is back.');render();return;}
      if(act==='hint'){if(!state.games.solitaire.hint().length)notify('No match available. Shuffle or Undo to continue.');render();return;}
      if(act==='shuffle'){clearAdvice();state.review='The remaining board has been reshuffled. Previous comparisons no longer apply.';if(state.games.solitaire.reshuffle())notify(state.games.solitaire.reflowed?'Remaining tiles reorganized into an open rescue layout. Undo history cleared.':'Remaining tiles reshuffled into a solvable arrangement. Undo history cleared.');render();return;}
      if(act==='opponents'){state.settings.opponents=control.dataset.value;render();return;}
      if(act==='start-table'||act==='new-table'){
        const g=state.mode==='hongkong'?new M.HongKongTable(state.settings):new M.AmericanTable(state.settings);
        clearAdvice();state.review='';state.games[state.mode]=g;state.blind=0;state.curtain=null;state.lastSeat=-1;state.selected=null;state.passSelected.clear();render();return;
      }
      if(act==='next-hand'){const next=currentGame().nextHand();if(!next){notify((state.mode==='hongkong'?'Four wind rounds':'Four rounds')+' complete! Start a new match when ready.');render();return;}clearAdvice();state.review='';state.games[state.mode]=next;state.curtain=null;state.lastSeat=-1;state.selected=null;state.blind=0;state.passSelected.clear();render();return;}
      if(act==='change-settings'){clearAdvice();state.review='';state.games[state.mode]=null;state.curtain=null;state.lastSeat=-1;render();return;}
      if(act==='reveal'){state.lastSeat=state.curtain;state.curtain=null;render();return;}
      const g=currentGame();if(!g)return;
      if(state.curtain!==null)return;
      if(act==='begin-charleston'){g.beginCharleston();render();return;}
      if(act==='continue-passing'){g.continuePassing();render();return;}
      if(act==='retry-blind'){g.retryBlindPass();state.passSelected.clear();state.blind=0;render();return;}
      if(act==='adjust-exposure'){g.adjustExposure(g.current,control.dataset.ids.split(',').map(Number));clearAdvice();state.selected=null;state.review='The new exposure changed. Its claimed tile stays, and it still fits an exposed practice row.';render();return;}
      if(act==='second-yes'||act==='second-no'){g.chooseSecond(g.charSeat,act==='second-yes');state.blind=0;render();return;}
      if(act==='courtesy-offer'){g.chooseCourtesy(g.charSeat,+control.dataset.count);render();return;}
      if(act==='goal'){state.goal=Number(control.dataset.goal);render();return;}
      if(act==='hand-pick'){
        const id=+control.dataset.id;
        if(g.phase==='charleston'){
          const tile=g.players[g.charSeat].hand.find(t=>t.id===id);
          if(tile?.type==='j'){notify('Jokers cannot be passed during the Charleston.');render();return;}
          if(state.passSelected.has(id))state.passSelected.delete(id);else if(state.passSelected.size<g.passCount(g.charSeat)-state.blind)state.passSelected.add(id);else notify('You have selected all required tiles for this pass.');
        }else state.selected=state.selected===id?null:id;
        render();return;
      }
      if(act==='submit-pass'){g.submitPass(g.charSeat,[...state.passSelected],state.blind);state.blind=0;state.passSelected.clear();state.selected=null;render();return;}
      if(act==='discard'){if(state.selected===null){notify('Select a tile from your rack first.');render();return;}const chosen=state.teaching?M.coach.alternatives(M.coach.publicView(g,g.current)).find(a=>a.id===state.selected||a.type===g.players[g.current].hand.find(t=>t.id===state.selected)?.type):null;g.discard(g.current,state.selected);if(chosen)state.review=`You discarded ${C.name(chosen.type)}. ${chosen.calculation} ${chosen.heuristic}`;clearAdvice();state.selected=null;render();return;}
      if(act==='claim'){const code=control.dataset.code;const explanation=M.coach.actionRule(g,g.offered().seat)+(g.variant==='hk'&&g.expanded&&code!=='win'&&g.offered().options.some(o=>o.kind==='win')?' Declining this win blocks another win on the same discarded tile type until your own next draw.':'');g.submitClaim(g.offered().seat,code);if(state.teaching)state.review=(code==='pass'?'You passed the claim. ':'Your legal claim was submitted. ')+explanation;clearAdvice();state.selected=null;render();return;}
      if(act==='win'){g.declareWin(g.current,true);clearAdvice();saveWin(state.mode);render();return;}
      if(act==='kong'){g.declareKong(g.current,control.dataset.type);clearAdvice();state.selected=null;state.review='The Kong changes your hand and may open a winning claim for an opponent. Request a fresh hint after its replacement draw.';render();return;}
      if(act==='joker-swap'){g.exchangeJoker(g.current,+control.dataset.seat,+control.dataset.meld);clearAdvice();state.selected=null;state.review='The natural tile is now exposed and the redeemed Joker is in your rack. Compare your new options before discarding.';notify('Joker redeemed! The exposed set still has its original tile value.');render();return;}
    }catch(err){notify(err.message);render();}
  });
  root.addEventListener('change',e=>{
    if(e.target.dataset.teaching){state.teaching=e.target.checked;try{localStorage.setItem('mahjong-atelier-teaching',state.teaching?'on':'off');}catch{}clearAdvice();render();return;}
    if(e.target.dataset.appearance==='theme'){
      if(THEMES.some(([id])=>id===e.target.value))state.appearance.theme=e.target.value;
      saveAppearance();render();return;
    }
    if(e.target.dataset.appearance==='indices'){
      state.appearance.indices=e.target.checked;saveAppearance();render();return;
    }
    if(e.target.dataset.blind){state.blind=Number(e.target.value);state.passSelected.clear();render();return;}
    const key=e.target.dataset.setting;if(!key)return;
    if(key==='secondCharleston')state.settings.secondCharleston=e.target.value==='true';
    if(key==='hkProfile')state.settings.hkProfile=e.target.value;
    if(key==='flowers'||key==='sevenPairs')state.settings[key]=e.target.checked;
    if(key==='minFan')state.settings.minFan=Number(e.target.value);
    render();
  });
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&state.showTileGuide){state.showTileGuide=false;render();root.querySelector('[data-act=tile-guide]')?.focus();}});
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&state.boardFocus&&!state.learning&&!state.showTileGuide){
      state.boardFocus=false;
      render();
      root.querySelector('[data-act="board-focus"]')?.focus({preventScroll:true});
    }
  });
  timerInterval=setInterval(()=>{
    if(state.mode!=='solitaire')return;
    const t=state.games.solitaire;
    const cell=document.querySelector('[data-timer]');if(cell)cell.textContent=C.elapsed(t.finishedSeconds??Math.floor((Date.now()-t.startedAt)/1000));
  },1000);
  let fitResizeTimer=null;
  window.addEventListener('resize',()=>{
    clearTimeout(fitResizeTimer);
    fitResizeTimer=setTimeout(fitSolitaireBoard,80);
  },{passive:true});
  render();
})(globalThis.Mahjong=globalThis.Mahjong||{});

