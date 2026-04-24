import type { Card, Curriculum, Direction, RawCurriculum, SessionEntry } from './types.js';

export function normalize(s: string): string {
  return s.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function toArray(v: string | readonly string[]): readonly string[] {
  return Array.isArray(v) ? v as readonly string[] : [v as string];
}

export function parseCurriculum(raw: RawCurriculum): Curriculum {
  return {
    curriculum: raw.curriculum,
    label: raw.label,
    audio: raw.audio ?? false,
    voice: raw.voice,
    piperVoice: raw.piperVoice,
    lessons: raw.lessons.map(l => ({
      name: l.name,
      notes: l.notes,
      ...(l.timeline ? { timeline: true } : {}),
      cards: l.cards.map(c => ({
        key: toArray(c.key),
        value: toArray(c.value),
        ...(c.note !== undefined ? { note: c.note } : {}),
      })),
    })),
  };
}

const DATE_RE = /^(-?\d{1,4})(?:-(\d{2})(?:-(\d{2}))?)?$/;

export interface ParsedDate {
  readonly serial: number;
  readonly year: number;
}

// Parse a date string (YYYY, YYYY-MM, YYYY-MM-DD; leading '-' for BC). Returns
// a sortable day-serial (precision only matters for relative layout, not
// calendar-correctness) plus the integer year for bucketing.
export function parseDate(s: string): ParsedDate | null {
  const m = DATE_RE.exec(s.trim());
  if (!m) return null;
  const y = parseInt(m[1]!, 10);
  const mo = m[2] ? parseInt(m[2], 10) : 7;
  const d = m[3] ? parseInt(m[3], 10) : 1;
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return {
    serial: y * 365.25 + (mo - 1) * 30.4 + (d - 1),
    year: y,
  };
}

export function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export function randomDirection(): Direction {
  return Math.random() < 0.5 ? 'key-to-value' : 'value-to-key';
}

export function buildSession(
  cards: readonly Card[],
  size = 15,
  rng: () => Direction = randomDirection,
): SessionEntry[] {
  return shuffle(cards).slice(0, size).map(card => ({ card, direction: rng() }));
}

export async function loadCurriculum(url: string): Promise<Curriculum> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
  return parseCurriculum(await res.json() as RawCurriculum);
}
