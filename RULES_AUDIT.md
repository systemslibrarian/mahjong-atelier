# Rules and accuracy audit

Reviewed 18 October 2026. Applies to **Atelier Hong Kong v2**, **American Practice v2**, Hong Kong Beginner, and Solitaire. This document records what the code implements, which references were consulted, and where Atelier makes a choice. It is not certification by a rules organization or an independent human rules expert.

The app teaches three distinct games. Completing its paths prepares you for its practice tables, not every regional game or tournament. Riichi is not implemented.

## Reference register

| ID | Reference and edition | Use and boundary |
| --- | --- | --- |
| S1 | [KDE KMahjongg rules](https://docs.kde.org/stable_kf6/en/kmahjongg/kmahjongg/rules.html), online documentation accessed on the review date | Matching, open sides, separate Flower/Season families. Atelier's layouts, scoring-free learning, clearing-deal construction, and rescue tray are its own features. |
| H1 | [Tabletopia-hosted Mahjong Rules](https://c.tabletopia.com/games/old-hong-kong-mahjong/rules/mahjong-rules/en), 27-page PDF, no edition date printed | Printed pages 8–12: turns, claims, Kongs, rounds, Hong Kong claim restrictions. Pages 13–17: scoring Variant 1. This compilation itself presents alternatives; it is not a universal governing standard. |
| H2 | [Mahj Life Cantonese/HKOS quick reference](https://mahjlife.com/wp-content/uploads/2023/09/Cantonese-Mahjong-HKOS_Quick-Reference-EZ-Reader.pdf), September 2023 | Cross-check of named scoring patterns and fixed special-hand totals. Linked for reading; its copyrighted reference sheet, wording, layout, and artwork are not distributed in Atelier. |
| A1 | [American Mah Jongg Association rules](https://www.americanmahjonggassociation.com/american-mah-jongg-rules), undated online guide, accessed on the review date | Public mechanics reference. Relevant chapters: [Charleston](https://guide.americanmahjonggassociation.com/how-to-play-american-mah-jongg/the-charleston/), [exposures](https://guide.americanmahjonggassociation.com/how-to-play-american-mah-jongg/claiming-discarded-tile-exposure/), [Jokers](https://guide.americanmahjonggassociation.com/how-to-play-american-mah-jongg/jokers-and-joker-exchange/), [payments](https://guide.americanmahjonggassociation.com/how-to-play-american-mah-jongg/hand-value-and-payment/), [seat rotation](https://guide.americanmahjonggassociation.com/how-to-play-american-mah-jongg/seat-rotation/). This does not supply an annual card license or League certification. |
| A2 | [National Mah Jongg League](https://www.nationalmahjonggleague.org/), current official materials | Users need their own current authorized card and applicable rules for annual-card play. No annual-card rows are implemented, reproduced, or validated. |
| C1 | [U.S. Copyright Office Circular 33](https://www.copyright.gov/circs/circ33.pdf) | Distinguishes methods/systems from their protectable expression. The project uses original code, tile drawings, instructional prose, and exercises; references are links, not permission to copy source materials. |

## What was checked

These are implementation findings, with the relevant reference IDs. The detailed rule library supplies original explanations and examples.

| Area | Implemented behavior | Evidence or explicit choice |
| --- | --- | --- |
| Solitaire | 144 tiles; uncovered tiles with an open horizontal side; exact-face matching, with separate Flower and Season families | S1; independent geometry checks exercise every removal in a complete deal for each of three layouts |
| Tile material | Four copies of each standard face; American additionally has eight Jokers and eight distinct Flowers/Seasons; invalid fifth copies cannot form a win | H1/A1; inventory and malformed-material tests |
| Setup and turns | Automatic dealing, drawing, bonus replacement, discard and claim windows; no extra draw after a non-Kong set claim | H1/A1; state-transition tests |
| Hong Kong claims | Chow only from the preceding seat; Pung/Kong from any latest discard; winning claims take priority | H1; legal/illegal claim fixtures |
| Hong Kong v2 exceptions | Thirteen Orphans precedes an ordinary winning claim; a declined qualifying win blocks that discarded type until the player's own next draw | H1, printed page 12; targeted regression fixtures; Beginner omits these conventions |
| Kongs | Concealed, exposed and added Kongs; replacement draws; an added Kong opens a winning-claim window | H1; timing, robbing and tile-conservation tests; opponent concealed identities stay hidden until a winning reveal |
| Ordinary scoring | All-Chows point requires a suited pair; complete bonus families include their own-seat bonus; final-discard bonus belongs to the discard directly after the last wall draw | H1 scoring Variant 1; independent literal expected-score fixtures |
| American passing | Opening dealer win; required first round; unanimous second round; blind forwarding; pairwise courtesy offers | A1; complete browser flow and all 256 combinations on each eligible blind pass |
| Passing exceptions | All-three-blind final right skips courtesy. Completed-round dealer wins are offered before proceeding | A1; boundary and no-packet tests; interpretation limits below |
| American exposures | Claim offers can vary natural/Joker mixture. The newly called exposure can be adjusted until discard or Joker redemption, retaining the claimed tile | A1; valid adjustment, invalid adjustment, conservation and locking tests |
| Joker exchange | After a draw or valid set claim, exchange a matching natural tile for an eligible exposed Joker; no single/pair substitution | A1; gameplay and practice tests |
| American points | Original row values; highest matching row; discarded-winning-tile and self-picked payments remain distinct | A1 mechanics, original Atelier values; independent payment fixtures |
| Matches | Hong Kong dealer continuation and four wind rounds; American 16 hands with initial-dealer seat swaps between rounds | H1/A1; score ownership and human identity survive seat changes |
| Advice | Ordinary one-draw completions use the same validator as play; recommendations distinguish rule, calculation, and heuristic | Code boundary tests throw if opponent racks, concealed sets, wall identities, or blocked Solitaire identities are read |

## Deliberate profile choices and remaining limits

**Hong Kong v2.** The settings select zero or three qualifying faan. Flower bonuses are excluded from that minimum: this is Atelier's choice, not a claim that every Hong Kong table does so. Special-hand totals are fixed and nonstacking; ordinary scores cap at ten. Seven distinct pairs is an optional four-faan rule, disabled by default. H1 and H2 inform the profile, but neither is presented as a complete specification of every Atelier choice. The rule library and scoring fixtures define these choices together.

The wall is a finite pool with replacement tiles taken from its back. There is no separate reserved dead-wall area, liability adjudication, false-declaration penalty, or robbing of a concealed Kong. One winning claimant is paid. Beginner has simpler scoring and standard hands only. Automated physical procedures do not teach dice rolls or manual wall-breaking technique.

**American Practice v2.** All six card rows, their names, and point values are original Atelier exercises. They omit the annual card's year-specific arrangements, color notation, categories, and constraints. Mechanics practice is useful, but it cannot establish whether a real card hand is valid. The official Singles and Pairs category's Joker-free-payment exception is explained in the lessons; there is no corresponding original-card category to score in this game.

The Charleston guide's rule against interrupting a started round is implemented as a win opportunity only before passing or after a completed three-pass round. It is not treated as permission to stop an intermediate pass. If nobody contributes a rack tile on **first left**, the interface preserves all racks and asks for another selection with at least one contributed tile. That recovery policy is explicit because the consulted guide's no-courtesy exception specifies **final right**. Physical timing disputes, dead-hand penalties, tournament etiquette, and accidental exposures are not adjudicated. Bots use simple heuristics, not expert strategy.

**Learning and advice.** Paths and staged practice cover fundamentals, not mastery of every rare hand. A staged practice rack is an original teaching fixture, not a replay or a prediction of the shuffled wall. Advice counts possible ordinary self-draw completions and visible copies; it does not calculate winning probabilities, multi-turn optimal play, or comprehensive defense. Exposed tiles and discards cannot guarantee safety. Retry restores practice fixtures; normal table play has no take-back button.

## Verification and provenance

The audit added **34 hand-calculated Hong Kong scoring fixtures**, with expected results stored independently of the scorer. Regression tests cover transition timing, impossible material, payments, exposure locking, both blind-pass directions, identity conservation, and private-information boundaries. These tests improve confidence in specific claims; they are not proof that every possible mahjong situation is correct.

The browser suite exercises each complete path and practice flow, saved progress, wrong/right feedback, comparisons, live guidance, passing, opening wins, exposure adjustments, advice refresh after Joker/Kong actions, concealed and winning-hand presentation, keyboard answers, and mobile overflow. Both modular and standalone builds are checked. CI runs the Node suite and rejects a stale standalone bundle before deployment.

Original text, exercises, SVG tile faces, and interface code are maintained in this repository. No annual-card transcription, screenshot, extracted table, competitor lesson, or external reference-sheet artwork is included in this update. Source links acknowledge the rules consulted. Copyright protection can extend to expression and arrangement even where game methods are not protected; source access alone is not a license. This audit records the implementation and provenance controls, not a legal guarantee.

For a future accuracy review, record the exact profile, settings, tiles, exposure history, winning source, expected result, and supporting source passage. A reproducible discrepancy should become a regression fixture before changing gameplay or instructional claims.
