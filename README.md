# Mahjong Atelier

**Choose a move, see why it helps, compare alternatives, and learn what changes under another variant.**

[Play Mahjong Atelier](https://systemslibrarian.github.io/mahjong-atelier/). Free, offline-capable, no accounts, ads, tracking, or bets. Original SVG tiles in four themes, readable English indices, computer opponents or local pass-and-play.

## Learn by making decisions

Every mode has a short interactive learning path covering tile recognition, setup, legal actions, goals, scoring/counting, and strategy. Tile examples, explanatory answers, targeted retries, saved bookmarks, and completion markers lead into staged guided practice. A rule library adds detailed chapters and visible references. Progress saves in this browser when storage is available; live games do not survive a reload.

- **Solitaire:** uncover a six-tile board, compare legal pairs by newly freed tiles, practice Flower matching, undo and replay.
- **Hong Kong:** compare three discards, preserve a wait, validate a winning hand, and declare a concealed Kong with a replacement draw.
- **American:** compare Charleston packets, protect a natural pair, redeem another player's exposed Joker, and complete an original practice-card hand.

Across-variant examples compare sequences, Kongs, Jokers, and the same 14-tile rack. They explicitly explain when a comparison does not apply. Lessons pause the table and preserve the regular game. Practice uses staged racks, not a predicted sequence of future draws.

Optional **Teaching mode** during normal play explains legal actions, offers hints before a decision, compares alternatives, and reviews a move afterward. Rules, calculations, and heuristics are labelled separately. Disable it for uninterrupted play.

## Supported rules and coverage

| Mode/profile | Playable coverage | Boundaries |
| --- | --- | --- |
| Solitaire | Complete 144-tile matching puzzle; four layouts, hints, undo, shuffle, rescue tray | A matching puzzle, not four-player mahjong; hints do not prove a full-board solution |
| Hong Kong Beginner | 136 tiles, four melds and pair, Chow/Pung/Kong, simplified faan, zero/three minimum | Introductory scoring; no special hands or bonus tiles |
| Atelier Hong Kong v2 | Named expanded house profile: optional Flowers/Seasons, added and robbed Kongs, special hands, qualifying minimum, capped scoring, payments and four wind rounds | Not a universal Hong Kong or tournament ruleset; exact conventions below and in the rule library |
| American Practice v2 | 152 tiles; first/optional second Charleston, blind and courtesy passes; exposures, concealed row, cross-player Joker exchanges; six original patterns and practice points | Mechanically playable original-card game; introductory coverage of American play. No licensed annual card, official-card validation, or tournament penalties |

The setup screen and active table display the named rules profile. Hong Kong tables show the qualifying-faan minimum, Flowers/Seasons, and seven-pairs setting; American tables identify the original practice card and its limits. During a game, this summary reads the running table's settings.

### Atelier Hong Kong v2 (18 October 2026)

Choose zero or three qualifying faan. Optional Flowers are replaced automatically; their bonuses do not satisfy the minimum. Seven distinct natural pairs is an opt-in four-faan house option. Thirteen Orphans and Nine Gates require concealed hands. The rule library lists all ordinary and fixed special scores, including wind/dragon sets, flushes, all Pungs, last-tile and Kong/robbing bonuses. Fixed special scores do not stack; ordinary scores cap at ten.

Base virtual payments for faan 0, 1, 2, 3, 4–6, 7–9, 10 are respectively 1, 2, 4, 8, 16, 32, 64. Each opponent pays the base; the discarder pays double, or all three pay double on self-draw. Dealer repeats on a dealer win or draw; otherwise dealer advances. Four complete rotations form a match. The wall is one finite pool, with replacement draws from its back. There is no separate dead-wall reserve, liability adjudication, or robbing of concealed Kongs. A complete Flower or Season family includes its own-seat bonus rather than adding it twice. All-Chows requires a suited pair. Thirteen Orphans outranks ordinary winning claims; declining a qualifying win blocks another discard win on that tile type until your own next draw. This narrower missed-win rule is an Atelier convention; it does not impose a missed-meld restriction on Pung, Chow, or Kong calls. These last two conventions apply to the expanded profile, not Beginner.

### American Practice v2

The six independently designed rows and their values are shown in the app. Natural singles/pairs are required; Jokers may fill groups of three or more. Sets and Pairs on these original rows use suit/honor faces; only Bloom Festival accepts Flowers/Seasons, as two natural singles. This is an original-card restriction, not a general American rule against Flower sets. Exposed groups must fit an exposed row, with at least one natural tile. Twin Comets is concealed. Discarded Jokers cannot be claimed. Redemption can use any player's eligible exposure after drawing or completing a valid claim and before discarding.

East checks for a dealt win before Charleston and may declare at a completed three-pass round boundary. The second Charleston requires unanimity. Last passes allow blind forwarding; courtesy pairs exchange the smaller offer. Passing resolves atomically. If all players choose three blind tiles on final right, passing ends without courtesy. On first left the app preserves every rack and asks for a new selection with at least one contributed rack tile: a disclosed interface policy. Newly called exposures may change size and natural/Joker mixture until discard or Joker redemption, retaining the claimed tile. Physical-table timing disputes, dead-hand penalties, and tournament etiquette are not adjudicated. A match lasts 16 hands; the initial dealer swaps seats to the right between rounds, with names and scores following each player. If multiple original rows match, the highest compatible row value is used. Points use original row values, doubled when Joker-free; discarders pay double and self-draw charges each opponent double. Exposing a winning discard preserves discard payment; completing through Joker redemption uses self-picked payment.

**Bring your own current authorized official card for real annual-card play.** This app neither reproduces nor validates its patterns, and is not endorsed by the National Mah Jongg League. Original exercises are clearly identified as Atelier examples. Rule references inform mechanics; their prose, artwork, and card layouts are not copied.

**Accuracy record (reviewed again 20 October 2026):** [Read the rule-by-rule audit](RULES_AUDIT.md), including source editions, verified behavior, explicit house choices, and unresolved physical-table coverage. The October 20 review fixes American bots exchanging away an existing win, rejects malformed exposures, shows complete exposed sets and bonus faces, protects private racks and advice during local handoffs, clears stale practice advice, and stops promising future draws from an empty wall. These profiles have automated verification, not independent rules-organization certification.

## What the coach can demonstrate

The coach receives an explicit public view: your rack, your melds, exposed public melds/discards, rule settings, and wall count. It cannot read opponents' concealed tiles or future draws. For each candidate discard it checks all possible tile types against the same winning/scoring engine, counts legal ordinary self-draw completions, and subtracts known copies. Unseen copies can be in opponents' hands; this is **not a draw probability**. At an empty wall it explicitly reports that no later self-draw is possible. It does not model special future circumstances, multi-turn shanten, opponent intent, or a complete defense strategy.

Candidates rank by these one-draw completion counts, then a labelled local-shape heuristic. American heuristics do not reward sequences. Visible discards are not proof of safety. No recommendation is described as proven optimal. Solitaire comparisons inspect free pairs and geometry, not covered tile identities. Tests enforce the hidden-information boundary with throwing getters.

## Sources and assumptions

Reviewed 18 and 20 October 2026; undated online sources are identified by access date. Hong Kong references describe conventions, not a single governing standard. The named Atelier profile is definitive for this app.

- [KDE KMahjongg rules](https://docs.kde.org/stable_kf6/en/kmahjongg/kmahjongg/rules.html): matching and tile-family mechanics; Atelier uses original layouts and features.
- [American Mah Jongg Association rulebook](https://www.americanmahjonggassociation.com/american-mah-jongg-rules), especially [Charleston](https://guide.americanmahjonggassociation.com/how-to-play-american-mah-jongg/the-charleston/) and [Joker exchange](https://guide.americanmahjonggassociation.com/how-to-play-american-mah-jongg/jokers-and-joker-exchange/).
- [National Mah Jongg League](https://www.nationalmahjonggleague.org/): official annual card and authorized learning materials.
- [Tabletopia-hosted Hong Kong rules](https://c.tabletopia.com/games/old-hong-kong-mahjong/rules/mahjong-rules/en): turn order, melds, claims, and replacements.
- [Mahj Life Cantonese/HKOS reference](https://mahjlife.com/wp-content/uploads/2023/09/Cantonese-Mahjong-HKOS_Quick-Reference-EZ-Reader.pdf): comparison of scoring conventions; Atelier uses its own documented profile and original presentation.

Riichi, online multiplayer, licensed annual-card play, and full tournament adjudication are not implemented.

## Accessibility and appearance

Four tile themes: Classic Ivory, Modern Minimal, Neon Night, Cozy Pastel. Native buttons, labelled tiles, visible focus, dialog keyboard handling/Escape, text feedback, selected outlines, and scrollable racks support desktop/mobile use. Interactive tile names include both the full English identity and visible abbreviations or glyphs. Learning has no time-based rewards. Theme and English-index choices also apply to practice dialogs.

On phones, Solitaire starts with **Portrait**, a six-column, 144-tile layered puzzle that gives tile faces more room. The game appears above the style and lesson panels, all three game tabs fit across the screen, and Undo, Hint, Shuffle, and New stay in a bottom toolbar. **Focus board** hides the surrounding panels and fits the board to the available space without shrinking tiles excessively; Exit focus or Escape restores them. Pinch zoom remains available. Rotating the phone or entering Focus preserves the current deal. Pyramid, Garden, and Bridge remain available, and desktop starts with Pyramid. A rescued Portrait board also stays six columns wide.

Required automated accessibility checks cover 23 screen/theme states in each build, including all three learning modes, the tile library, active tables, private handoffs, and mobile layout. These checks detect selected WCAG A/AA problems; they do not replace manual assistive-technology testing or certify complete WCAG conformance.

## Run and verify

Open `Mahjong_Atelier.html` directly for the bundled offline version, or serve the repository with `python -m http.server 8000` and visit `http://localhost:8000`. The hosted app links to the standalone download. Save that file and open it locally for offline play; the hosted site does not install a service worker.

Development verification requires **Node 24 or later** and Python 3. The lockfile pins development-only TypeScript, Playwright, and axe tools. The shipped game has no npm runtime dependencies.

```sh
npm ci --ignore-scripts
npm run typecheck
npm test
python build.py
npx playwright install --with-deps chromium
npm run test:browser
npm run test:browser:offline
npm run test:mobile
npm run test:mobile:offline
npm run test:a11y
npm run test:a11y:offline
```

The **136 Node tests** include all **118,800** possible one-suit 14-tile inventories checked against an independent meld catalogue, **14,400 mixed-suit comparisons** over three replayable seeds, **4,480 independently calculated scoring-context cases**, and the existing 34 hand-calculated scoring fixtures. Mixed-suit coverage includes all suit permutations, honors, zero through four exposures, Kongs, broken pairs, independently judged mutations, and fifth-copy rejection. The suite also checks legal claims, special hands, payments, all 256 blind-pass combinations on each final pass, full bot games, lesson answers, practice transitions, and advice privacy/calculations. A seeded 32-hand probe checks physical-tile conservation, logical hand sizes, and zero-sum scores.

Strict `checkJs` checks JSDoc contracts in `core.js`, `table.js`, `hongkong.js`, `american.js`, and `coach.js`. Contracts distinguish physical tiles from tile faces, physical melds from scoring decompositions, claim variants, phases, and results. Ten negative compile fixtures ensure these mistakes remain rejected. UI, lessons, practice, and the Solitaire implementation remain outside this incremental typing boundary.

**Deployment requires every gate to pass:** JavaScript syntax, strict core types, the complete Node suite, a fresh standalone bundle, and browser, touch/mobile, and accessibility checks for both modular and standalone editions. Browser jobs run in parallel after the engine checks. Failure screenshots and traces, mobile screenshots, and incremental accessibility reports are retained as Actions artifacts for 14 days. Each browser command has a three-minute limit; browser jobs have a 45-minute limit.

The browser suite verifies active rules summaries, all learning paths, wrong/right feedback, comparisons, guided practices, persistence, live hints, American passing and opening wins, provisional exposure changes, Joker/Kong advice refresh, every exposed tile and Joker count, public Flower/Season faces, private local handoffs, concealed and winning-rack presentation, keyboard answers, mobile overflow, and Escape. The touch suite checks 320, 360, 390, 430, and 620px viewports, visible tile bounds, real pair taps and Undo, focus controls, rotation without redealing, browser pinch zoom, all four layouts, and the standalone build. Browser fixtures use a fixed random seed without changing production randomness.

Local evidence is saved under `test-results/modular/` or `test-results/offline/`. Set `ATELIER_URL` to test a served site, `CHROMIUM_EXECUTABLE` for an existing Chromium binary, `ATELIER_ARTIFACT_DIR` to change the evidence directory, or `ATELIER_SCREENSHOT` to override the smoke test's mobile screenshot path. Without an override, each command opens the corresponding local HTML file.

## Source layout

`js/core.js` renders tiles; `solitaire.js`, `table.js`, `hongkong.js`, and `american.js` implement games. `coach.js` owns public-state analysis; `path.js`, `practice.js`, and `learn.js` provide learning flows; `ui.js` connects them. `types/mahjong.d.ts` supplies shared checked engine contracts. `styles.css` preserves Atelier's visual identity. `RULES_AUDIT.md` records source evidence and profile limits; `tests/fixtures/hk-scores.json` holds independent expected scores. `build.py` bundles these into `Mahjong_Atelier.html`. GitHub Actions tests and deploys pushes to `main`.
