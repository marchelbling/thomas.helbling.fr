export type Direction = 'key-to-value' | 'value-to-key';

export interface Card {
  readonly key: readonly string[];
  readonly value: readonly string[];
  readonly note?: string;
}

export interface Lesson {
  readonly name: string;
  readonly cards: readonly Card[];
  readonly notes?: string;
}

export interface Curriculum {
  readonly curriculum: string;
  readonly label: string;
  readonly audio: boolean;
  readonly voice?: string;
  readonly piperVoice?: string;
  readonly lessons: readonly Lesson[];
}

export interface SessionEntry {
  readonly card: Card;
  readonly direction: Direction;
}

export type CardResult = 'correct' | 'wrong';

export interface GameState {
  readonly entries: readonly SessionEntry[];
  readonly index: number;
  readonly score: number;
  readonly total: number;
  readonly failed: boolean;
  readonly results: readonly CardResult[];
}

// Raw JSON shape: key/value may be string or string[]
export interface RawCard {
  readonly key: string | readonly string[];
  readonly value: string | readonly string[];
  readonly note?: string;
}
export interface RawLesson {
  readonly name: string;
  readonly cards: readonly RawCard[];
  readonly notes?: string;
}
export interface RawCurriculum {
  readonly curriculum: string;
  readonly label: string;
  readonly audio?: boolean;
  readonly voice?: string;
  readonly piperVoice?: string;
  readonly lessons: readonly RawLesson[];
}
