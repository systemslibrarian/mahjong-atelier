/** Compile-only negative contracts. An unused @ts-expect-error fails the gate. */
const contractTile: Atelier.Tile = {id: 1, type: 'b1'};
const contractMeld: Atelier.PhysicalMeld = {kind: 'pung', type: 'b1', tiles: [contractTile]};
const contractScoredMeld: Atelier.ScoredMeld = {kind: 'pung', type: 'b1', tiles: ['b1']};
// @ts-expect-error A non-existent rank is not a Mahjong face.
const invalidTileCode: Atelier.TileCode = 'b10';
// @ts-expect-error Physical tiles require an identity as well as a face.
const invalidTile: Atelier.Tile = 'b1';
// @ts-expect-error Scoring decompositions cannot substitute for physical melds.
const invalidPhysicalMeld: Atelier.PhysicalMeld = contractScoredMeld;
// @ts-expect-error Physical tile objects are not scoring partition faces.
const invalidScoredMeld: Atelier.ScoredMeld = contractMeld;
// @ts-expect-error A set claim must identify the physical tiles to consume.
const invalidClaim: Atelier.Claim = {kind: 'pung', code: 'pung', type: 'b1', priority: 50, title: 'Pung'};
// @ts-expect-error A winning claim does not consume an arbitrary meld packet.
const invalidWinClaim: Atelier.Claim = {kind: 'win', code: 'win', use: [1, 2], priority: 100, title: 'Win'};
// @ts-expect-error Typing protects the finite state machine vocabulary.
const invalidPhase: Atelier.Phase = 'draw-again';
if (Mahjong.core) {
  // @ts-expect-error Public core API rejects unknown tile codes.
  Mahjong.core.makeTile('banana');
  // @ts-expect-error The hand sorter receives physical tiles, not just faces.
  Mahjong.core.sortHand(['b1', 'b2']);
}
if (Mahjong.hongkongTest) {
  // @ts-expect-error Rules validators must receive physical melds.
  Mahjong.hongkongTest.partitions([contractTile], [contractScoredMeld]);
}
