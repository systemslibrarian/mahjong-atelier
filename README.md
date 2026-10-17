# Mahjong Atelier

A browser-based, offline-first Mahjong game with three modes and four interchangeable tile-face themes.

## Play

- **Mahjong Solitaire:** 144-tile layered matching puzzles with three board layouts, Hint, Undo, Shuffle, and a rescue tray.
- **Hong Kong Basics:** Four-player beginner table with computer opponents or local pass-and-play. Draw/discard, Chow/Pung/Kong, and a simplified winning-hand/faan model.
- **American Practice:** Four-player beginner table with Charleston, eight Jokers, eight bonus tiles, Joker redemption, and **original practice patterns** (not the NMJL annual card).

This is **not** an online multiplayer service. It does not include Riichi rules, full Hong Kong tournament scoring, or licensed annual American card patterns. These are distinct projects rather than mere appearances.

## Tile styles

The tile engine renders each face with built-in SVG and readable text (no network assets):

- Classic Ivory (default)
- Modern Minimal
- Neon Night
- Cozy Pastel

**English indices** can be toggled on and off. The **Learn the tiles** reference explains Dots, Bamboo, Characters, Winds, Dragons, bonus tiles and Jokers. Tile appearance does not alter game rules or card identities. The appearance setting persists in browser storage when the browser permits it.

## Play online

After the repository's GitHub Pages source is enabled, play at https://systemslibrarian.github.io/mahjong-atelier/ . In GitHub, open **Settings → Pages**, then select **GitHub Actions** under **Build and deployment → Source**. The included workflow will deploy each push to `main` after passing engine tests.

## Run

Open [`Mahjong_Atelier.html`](Mahjong_Atelier.html) in a browser. The standalone version bundles all source code and CSS into a single file and works without a network connection.

Alternatively, host this repository as a static site (for example, through GitHub Pages), or run locally:

```sh
python -m http.server 8000
```

Visit `http://localhost:8000`.

## Layout

- `index.html`: static entry point
- `styles.css`: app UI + theme variables
- `js/core.js`: tile IDs, tile face rendering, common helpers
- `js/solitaire.js`: tile matching/board logic
- `js/table.js`: four-player table state
- `js/hongkong.js`: Hong Kong beginner rules
- `js/american.js`: American practice rules
- `js/ui.js`: UI, controls, in-browser preferences and teaching modal
- `build.py`: build the single-file `Mahjong_Atelier.html`
- `tests/engine.test.cjs`: game engine regression tests (Node built-in test runner)
- `.github/workflows/deploy.yml`: automated test and GitHub Pages deployment

The app stores no accounts, personal identifiers or remote game state.