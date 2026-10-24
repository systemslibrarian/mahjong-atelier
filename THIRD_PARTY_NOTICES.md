# Tile artwork

The vector faces for 1-Bamboo, Characters 1–9, the four Winds, and the Red and
Green Dragons are adapted from **FluffyStuff / riichi-mahjong-tiles**:

- Source: https://github.com/FluffyStuff/riichi-mahjong-tiles
- Revision: `26e127ba2117f45cdce5ea0225748cc0cfad3169`
- Original files: `Regular/Sou1.svg`, `Regular/Man1.svg` through `Man9.svg`,
  `Regular/Ton.svg`, `Nan.svg`, `Shaa.svg`, `Pei.svg`, `Chun.svg`, and `Hatsu.svg`.
- License: CC0 1.0 Universal — https://creativecommons.org/publicdomain/zero/1.0/

The upstream license states:

> This work is in the public domain. For more information, visit https://creativecommons.org/publicdomain/zero/1.0/.

Atelier removes editor metadata and shared SVG IDs, rounds path coordinates,
inlines the bird's referenced path, and maps ink colors to its four tile themes.
The vector faces are bundled locally in `js/tile-art.js`, including in the
standalone offline HTML. No external image or font service is contacted.

Dots, Bamboo 2–9, the White Dragon frame, Flowers, Seasons, and Joker artwork
are drawn by Mahjong Atelier. Tile identity and matching rules are unchanged.
