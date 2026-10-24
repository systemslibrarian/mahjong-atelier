/** Shared contracts for the checked rules engines. UI, lessons, practice and
 * Solitaire implementation remain outside this incremental checkJs boundary. */
declare namespace Atelier {
  type Suit = 'b' | 'd' | 'c';
  type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
  type HonorCode = 'we' | 'ws' | 'ww' | 'wn' | 'dr' | 'dg' | 'dw';
  type StandardTileCode = `${Suit}${Rank}` | HonorCode;
  type BonusTileCode = `f${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8}`;
  type TileCode = StandardTileCode | BonusTileCode | 'j';
  type Variant = 'hk' | 'american';
  type TileSet = Variant | 'solitaire';
  type Phase = 'discard' | 'claims' | 'robkong' | 'finished' | 'opening' | 'passingWin' | 'charleston' | 'secondChoice' | 'courtesyChoice' | 'blindDeadlock';
  type DrawSource = 'deal' | 'draw' | 'kong' | 'claim' | 'exchange';
  type MeldKind = 'chow' | 'pung' | 'kong' | 'quint' | 'sextet';
  type KongOption = TileCode | `add:${TileCode}`;

  interface Tile { id: number; type: TileCode }
  interface PhysicalMeld {
    kind: MeldKind; type: TileCode; tiles: Tile[];
    concealed?: boolean; from?: number; claimedTileId?: number;
  }
  interface ExposureCandidate {
    kind?: MeldKind; type?: TileCode; tiles: Tile[]; concealed?: boolean;
  }
  /** A decomposition contains faces, never physical tile objects or identities. */
  interface ScoredMeld { kind: MeldKind; type: TileCode; tiles: TileCode[]; concealed?: boolean }
  interface Partition { pair: StandardTileCode; melds: ScoredMeld[] }
  interface WinClaim { code: 'win'; kind: 'win'; priority: number; title: string }
  interface SetClaim { code: string; kind: MeldKind; type: TileCode; use: number[]; priority: number; title: string }
  type Claim = WinClaim | SetClaim;
  interface Offer { seat: number | null; options: Claim[] }
  interface ClaimVote { seat: number; option: Claim }
  interface LastDiscard { tile: Tile; by: number; lastWall: boolean }
  interface PendingKong { seat: number; tile: Tile; type: TileCode }
  interface ScoreContext {
    seat: number; prevailing: number; selfDraw: boolean; flowers: Tile[];
    flowersEnabled: boolean; source: DrawSource | 'robkong'; lastWall: boolean;
    heavenly: boolean; earthly: boolean; sevenPairs: boolean;
  }
  interface HongKongAnalysis {
    fan: number; qualifyingFan?: number; details: string[];
    partition?: Partition; special?: string; card?: never;
  }
  interface CardPattern {
    id: string; name: string; groups: number[]; description: string;
    level: string; value: number; flowers?: number; concealed?: boolean;
  }
  interface AmericanAnalysis { card: CardPattern; jokerFree: boolean; details: string[]; fan?: never }
  type Analysis = HongKongAnalysis | AmericanAnalysis;
  type CoachAnalysis = HongKongAnalysis | { card: CardPattern; fan?: never };
  interface WinResult {
    kind: 'win'; seat: number; analysis: Analysis; selfDraw: boolean;
    from: number | null; message: string; payments: number[]; base: number;
  }
  interface DrawResult { kind: 'draw'; message: string; payments: number[] }
  type Result = WinResult | DrawResult;
  interface MatchSettings { dealer?: number; round?: number; rotations?: number; hands?: number; scores?: number[]; occupants?: number[] }
  interface Settings {
    opponents?: 'bots' | 'local'; hkProfile?: 'beginner' | 'atelier';
    flowers?: boolean; minFan?: number | string; sevenPairs?: boolean;
    secondCharleston?: boolean; match?: MatchSettings;
  }
  interface Player {
    id: number; name: string; seat: number; hand: Tile[]; melds: PhysicalMeld[];
    flowers: Tile[]; discards: Tile[]; bot: boolean;
  }
  interface Table {
    variant: Variant; settings: Settings & { opponents: 'bots' | 'local' };
    dealer: number; round: number; rotations: number; handNumber: number; scores: number[];
    expanded: boolean; flowersEnabled: boolean; players: Player[]; wall: Tile[];
    current: number; phase: Phase; claimQueue: number[]; claimVotes: ClaimVote[];
    lastDiscard: LastDiscard | null; winner: number | null; result: Result | null;
    log: string[]; lastSource: DrawSource; lastDraw: Tile | null;
    discardCount: number; interrupted: boolean; winningFrom: number | null;
    minFan?: number; charSeat?: number;
    windIndex(seat: number): number; windName(seat: number): string;
    note(message: string): void; who(): number | null;
    drawTile(seat: number, replacement?: boolean, source?: DrawSource): Tile | null;
    drawReplacement(seat: number): boolean; nextTurn(from: number): void | false;
    discard(seat: number, tileId: number): void;
    offered(): Offer; submitClaim(seat: number, code: string): void;
    resolveClaims(): void; isBotSeat(seat: number | null): boolean;
    endDraw(): false; canDeclareWin(seat: number): Analysis | null;
    declareWin(seat: number, selfDraw?: boolean): WinResult;
    nextHand(): Table | null; integrity(): number;
    winAnalysis(seat: number, extra?: Tile | null, selfDraw?: boolean): Analysis | null;
    paymentBase(analysis: Analysis): number;
    claimOptions(seat: number, tile: Tile, by: number): Claim[];
    robOptions?(seat: number): Claim[]; resolveRob?(): void;
    kongOptions?(seat: number): KongOption[]; declareKong?(seat: number, option: KongOption): void;
    botChooseClaim(offer: Offer): string; botChooseDiscard(seat: number): number; botStep(): boolean;
  }
  interface HongKongTable extends Table {
    winAnalysis(seat: number, extra?: Tile | null, selfDraw?: boolean): HongKongAnalysis | null;
    paymentBase(analysis: HongKongAnalysis): number;
    variant: 'hk'; minFan: number; missedWins: Set<TileCode>[]; pendingKong: PendingKong | null;
    robOptions(seat: number): Claim[]; resolveRob(): void;
    kongOptions(seat: number): KongOption[]; declareKong(seat: number, option: KongOption): void;
  }
  interface PassRoute { name: 'Right' | 'Across' | 'Left'; offset: number; courtesy?: boolean }
  interface ExposureAdjustment { ids: number[]; size: number; natural: number; jokers: number }
  interface AmericanTable extends Table {
    winAnalysis(seat: number, extra?: Tile | null, selfDraw?: boolean): AmericanAnalysis | null;
    paymentBase(analysis: AmericanAnalysis): number;
    variant: 'american'; passRoute: PassRoute[]; charIndex: number;
    charPicks: (number[] | null)[]; charSeat: number; blindPicks: number[];
    secondVotes: (boolean | null)[]; courtesyOffers: (number | null)[];
    editableExposure: { seat: number; index: number } | null;
    pendingPassPhase: Phase | null;
    beginCharleston(seat?: number): void; offerPassingWin(next: Phase): void;
    continuePassing(seat?: number): void; retryBlindPass(): void;
    passCount(seat: number): number; canBlind(): boolean;
    chooseSecond(seat: number, yes: boolean): void; chooseCourtesy(seat: number, n: number): void;
    beginCourtesy(): void; startPlay(): void;
    exposureFits(melds: ExposureCandidate[]): boolean;
    botPassTiles(seat: number): number[]; submitPass(seat: number, ids: number[], blind?: number): void;
    finishPass(): void; adjustmentOptions(seat: number): ExposureAdjustment[];
    adjustExposure(seat: number, ids: number[]): void;
    exchangeJoker(seat: number, fromSeat: number, meldIndex: number): void;
  }
  interface BaseConstructor { new(variant: Variant, settings?: Settings): Table }
  interface ProfileConstructor<T extends Table = Table> { new(settings?: Settings): T }
  interface Core {
    SUITS: Suit[]; HONORS: HonorCode[]; STANDARD_TYPES: StandardTileCode[];
    SUIT_NAMES: Record<string, string>; FLOWERS: string[];
    tileset(variant?: TileSet): Tile[]; makeTile(type: TileCode): Tile;
    validMaterial(tiles: readonly Tile[], variant?: Variant): boolean;
    shuffle<T>(arr: T[], random?: () => number): T[];
    count(hand: readonly Tile[], type: TileCode): number;
    countTypes(tiles: readonly Tile[]): Record<string, number>;
    sortHand<T extends Tile>(hand: T[]): T[];
    name(type: TileCode | '' | null | undefined): string;
    tileAccessibleName(type: TileCode): string;
    matchKey(type: TileCode | '' | null | undefined): string | null | undefined;
    tileMarkup(type: TileCode): string;
    tileButton(tile: Tile | TileCode, opts?: {className?: string; selected?: boolean; disabled?: boolean; attr?: string}): string;
    elapsed(seconds: number): string; setCountValid(tiles: readonly Tile[]): boolean;
  }
  interface HongKongRules {
    partitions(tiles: Tile[], exposed?: PhysicalMeld[]): Partition[];
    fanScore(partition: Partition, exposed: PhysicalMeld[], seat: number, selfDraw: boolean, prevailing?: number): HongKongAnalysis;
    extendedScore(partition: Partition, exposed: PhysicalMeld[], tiles: Tile[], context: ScoreContext): HongKongAnalysis;
    specialHands(tiles: Tile[], exposed: PhysicalMeld[], context: ScoreContext): HongKongAnalysis[];
  }
  interface AmericanRules {
    CARD: CardPattern[]; ROUTE: PassRoute[];
    matchPattern(hand: Tile[], melds: ExposureCandidate[] | undefined, pattern: CardPattern): boolean;
    winningPatterns(hand: Tile[], melds?: ExposureCandidate[]): CardPattern[];
  }
  interface PublicView {
    variant: Variant; seat: number; phase: Phase; current: number;
    hand: Tile[]; melds: PhysicalMeld[]; flowers: Tile[];
    opponents: {seat: number; melds: PhysicalMeld[]; discards: Tile[]}[];
    discards: Tile[]; publicMelds: PhysicalMeld[];
    expanded: boolean; minFan: number; seatWind: number; prevailing: number;
    flowersEnabled: boolean; sevenPairs: boolean; wallCount: number;
    lastSource: DrawSource; latest: {type: TileCode; by: number} | null;
  }
  interface Support { same: number; adjacent: number; gapped: number; cost: number }
  interface Wait { type: TileCode; unseen: number; fan: number | null; pattern: string | null }
  interface Alternative {
    id: number; type: TileCode; waits: Wait[]; unseenWinning: number; support: Support;
    rule: string; calculation: string; heuristic: string; defense: string;
  }
  interface BoardPosition { id: string; x: number; y: number; z: number; removed?: boolean }
  interface SolitaireGeometry {
    tiles: BoardPosition[]; available(): BoardPosition[]; pairs(): string[][];
  }
  interface SolitaireChoice { ids: string[]; newly: string[]; rule: string; calculation: string; heuristic: string }
  interface Coach {
    publicView(game: Table, seat: number): PublicView;
    winForView(view: PublicView, tiles: Tile[]): CoachAnalysis | null;
    knownCounts(view: PublicView): Record<string, number>;
    support(hand: Tile[], tile: Tile, variant: Variant): Support;
    alternatives(view: PublicView): Alternative[];
    solitaireChoices(game: SolitaireGeometry): SolitaireChoice[];
    actionRule(game: HongKongTable | AmericanTable, seat: number): string;
  }
  /** Optional during ordered script loading; each checked file validates the
   * dependencies it consumes before exporting its implementation. */
  interface Registry {
    tileArt?: Record<string, string>;
    core?: Core; BaseTable?: BaseConstructor;
    HongKongTable?: ProfileConstructor<HongKongTable>;
    AmericanTable?: ProfileConstructor<AmericanTable>;
    hongkongTest?: HongKongRules; americanTest?: AmericanRules; coach?: Coach;
    solitaireTest?: {free(position: BoardPosition, occupied: Map<string, BoardPosition>): boolean};
  }
}
declare var Mahjong: Atelier.Registry;
