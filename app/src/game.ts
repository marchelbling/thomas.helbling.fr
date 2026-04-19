import type { Card, Direction, GameState, SessionEntry } from './types.js';
import { normalize } from './data.js';

export function prompt(card: Card, direction: Direction): string {
  return direction === 'key-to-value' ? card.key[0]! : card.value[0]!;
}

export function accepted(card: Card, direction: Direction): readonly string[] {
  return direction === 'key-to-value' ? card.value : card.key;
}

export function expected(card: Card, direction: Direction): string {
  return accepted(card, direction)[0]!;
}

export function checkAnswer(entry: SessionEntry, input: string): boolean {
  const n = normalize(input);
  if (!n) return false;
  return accepted(entry.card, entry.direction).some(a => normalize(a) === n);
}

export function createGame(entries: readonly SessionEntry[]): GameState {
  return { entries, index: 0, score: 0, total: entries.length, failed: false, results: [] };
}

export function current(state: GameState): SessionEntry {
  return state.entries[state.index]!;
}

export function markFailed(state: GameState): GameState {
  return { ...state, failed: true };
}

export function advance(state: GameState): GameState {
  const result = state.failed ? 'wrong' as const : 'correct' as const;
  return { ...state, index: state.index + 1, failed: false, results: [...state.results, result] };
}

export function addScore(state: GameState): GameState {
  return { ...state, score: state.score + 1 };
}

export function isDone(state: GameState): boolean {
  return state.index >= state.entries.length;
}
