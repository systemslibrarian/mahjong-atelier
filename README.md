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
| Solitaire | Complete 144-tile matching puzzle; three layouts, hints, undo, shuffle, rescue tray | A matching puzzle, not four-player mahjong; hints do not prove a full-board solution |
| Hong Kong Beginner | 136 tiles, four melds and pair, Chow/Pung/Kong, simplified faan, zero/three minimum | Introductory scoring; no special hands or bonus tiles |
| Atelier Hong Kong v1 | Named expanded house profile: optional Flowers/Seasons, added and robbed Kongs, special hands, qualifying minimum, capped scoring, payments and four wind rounds | Not a universal Hong Kong or tournament ruleset; exact conventions below and in the rule library |
| American Practice v1 | 152 tiles; first/optional second Charleston, blind and courtesy passes; exposures, concealed row, cross-player Joker exchanges; six original patterns and practice points | Mechanically playable original-card game; introductory coverage of American play. No licensed annual card, official-card validation, or tournament penalties |

### Atelier Hong Kong v1 (18 October 2026)

Choose zero or three qualifying faan. Optional Flowers are replaced automatically; their bonuses do not satisfy the minimum. Seven distinct natural pairs is an opt-in four-faan house option. Thirteen Orphans and Nine Gates require concealed hands. The rule library lists all ordinary and fixed special scores, including wind/dragon sets, flushes, all Pungs, last-tile and Kong/robbing bonuses. Fixed special scores do not stack; ordinary scores cap at ten.

Base virtual payments for faan 0, 1, 2, 3, 4–6, 7–9, 10 are respectively 1, 2, 4, 8, 16, 32, 64. Each opponent pays the base; the discarder pays double, or all three pay double on self-draw. Dealer repeats on a dealer win or draw; otherwise dealer advances. Four complete rotations form a match. The wall is one finite pool, with replacement draws from its back. There is no separate dead-wall reserve, liability adjudication, or robbing of concealed Kongs. Flower-family bonuses explicitly stack with own-Flower bonuses in this house profile.

### American Practice v1

The six independently designed rows and their values are shown in the app. Natural singles/pairs are required; Jokers may fill groups of three or more. Exposed groups must fit an exposed row, with at least one natural tile. Twin Comets is concealed. Discarded Jokers cannot be claimed. Redemption can use any player's eligible exposure after drawing or completing a valid claim and before discarding.

The second Charleston requires unanimity. Last passes allow blind forwarding; courtesy pairs exchange the smaller offer. Passing is resolved atomically. An all-three-blind cycle leaves racks unchanged and continues to the next phase: an explicit house convention. Pre-Charleston wins, physical-table declaration windows, provisional exposure adjustment, dead-hand penalties, and tournament etiquette are not simulated. A match rotates dealer for 16 hands. If multiple original rows match, the highest compatible row value is used. Points use original row values, doubled when Joker-free; discarders pay double and self-draw charges each opponent double. Exposing a winning discard preserves discard payment; completing through Joker redemption uses self-picked payment.

**Bring your own current authorized official card for real annual-card play.** This app neither reproduces nor validates its patterns, and is not endorsed by the National Mah Jongg League. Original exercises are clearly identified as Atelier examples. Rule references inform mechanics; their prose, artwork, and card layouts are not copied.

## What the coach can demonstrate

The coach receives an explicit public view: your rack, your melds, exposed public melds/discards, rule settings, and wall count. It cannot read opponents' concealed tiles or future draws. For each candidate discard it checks all possible tile types against the same winning/scoring engine, counts legal ordinary self-draw completions, and subtracts known copies. Unseen copies can be in opponents' hands; this is **not a draw probability**. It does not model special future circumstances, multi-turn shanten, opponent intent, or a complete defense strategy.

Candidates rank by these one-draw completion counts, then a labelled local-shape heuristic. American heuristics do not reward sequences. Visible discards are not proof of safety. No recommendation is described as proven optimal. Solitaire comparisons inspect free pairs and geometry, not covered tile identities. Tests enforce the hidden-information boundary with throwing getters.

## Sources and assumptions

Reviewed 18 October 2026; undated online sources are identified by access date. Hong Kong references describe conventions, not a single governing standard. The named Atelier profile is definitive for this app.

- [American Mah Jongg Association rulebook](https://www.americanmahjonggassociation.com/american-mah-jongg-rules), especially [Charleston](https://guide.americanmahjonggassociation.com/how-to-play-american-mah-jongg/the-charleston/) and [Joker exchange](https://guide.americanmahjonggassociation.com/how-to-play-american-mah-jongg/jokers-and-joker-exchange/).
- [National Mah Jongg League](https://www.nationalmahjonggleague.org/): official annual card and authorized learning materials.
- [Tabletopia-hosted Hong Kong rules](https://c.tabletopia.com/games/old-hong-kong-mahjong/rules/mahjong-rules/en): turn order, melds, claims, and replacements.
- [Mahj Life Cantonese/HKOS reference](https://mahjlife.com/wp-content/uploads/2023/09/Cantonese-Mahjong-HKOS_Quick-Reference-EZ-Reader.pdf): comparison of scoring conventions; Atelier uses its own documented profile and original presentation.

Riichi, online multiplayer, licensed annual-card play, and full tournament adjudication are not implemented.

## Accessibility and appearance

Four tile themes: Classic Ivory, Modern Minimal, Neon Night, Cozy Pastel. Native buttons, labelled tiles, visible focus, dialog keyboard handling/Escape, text feedback, selected outlines, and scrollable racks support desktop/mobile use. Learning has no time-based rewards. Theme and English-index choices also apply to practice dialogs.

## Run and verify

Open `Mahjong_Atelier.html` directly for the bundled offline version, or serve the repository with `python -m http.server 8000` and visit `http://localhost:8000`.

```sh
node --test tests/*.test.cjs
python build.py
```

Tests cover legal claims, scoring, special hands, payments, all 256 blind-pass combinations, tile conservation, full bot games, lesson answers, practice transitions, and advice privacy/calculations. CI checks JavaScript and all Node tests before GitHub Pages deployment.

Optional browser integration checks require Playwright and Chromium (`npm install --no-save playwright`, then `npx playwright install chromium`):

```sh
node tests/browser-smoke.cjs
```

Set `ATELIER_URL` to test a served site or the bundled file, `CHROMIUM_EXECUTABLE` for an existing Chromium binary, and `ATELIER_SCREENSHOT` for the mobile screenshot output. The browser script verifies all learning paths, wrong/right feedback, comparisons, guided practices, persistence, live hints, American passing, mobile overflow and Escape.

## Source layout

`js/core.js` renders tiles; `solitaire.js`, `table.js`, `hongkong.js`, and `american.js` implement games. `coach.js` owns public-state analysis; `path.js`, `practice.js`, and `learn.js` provide learning flows; `ui.js` connects them. `styles.css` preserves Atelier's visual identity. `build.py` bundles these into `Mahjong_Atelier.html`. GitHub Actions tests and deploys pushes to `main`.
