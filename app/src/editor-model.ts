import type { RawCard, RawCurriculum, RawLesson } from './types.js';

export interface EditCard {
  key: string;
  value: string;
  note: string;
}
export interface EditLesson {
  name: string;
  notes: string;
  timeline: boolean;
  cards: EditCard[];
  collapsed: boolean;
}
export interface EditCurriculum {
  curriculum: string;
  label: string;
  audio: boolean;
  voice: string;
  piperVoice: string;
  lessons: EditLesson[];
}

export function emptyCurriculum(): EditCurriculum {
  return {
    curriculum: '',
    label: '',
    audio: false,
    voice: '',
    piperVoice: '',
    lessons: [],
  };
}

function splitAliases(s: string): string[] {
  return s.split('/').map(x => x.trim()).filter(x => x !== '');
}

function joinAliases(v: string | readonly string[]): string {
  return Array.isArray(v) ? (v as string[]).join(' / ') : (v as string);
}

export function toRaw(s: EditCurriculum): RawCurriculum {
  const lessons: RawLesson[] = s.lessons.map(l => {
    const cards: RawCard[] = l.cards.map(c => {
      const ks = splitAliases(c.key);
      const vs = splitAliases(c.value);
      const card: { key: string | string[]; value: string | string[]; note?: string } = {
        key: ks.length <= 1 ? (ks[0] ?? '') : ks,
        value: vs.length <= 1 ? (vs[0] ?? '') : vs,
      };
      if (c.note.trim() !== '') card.note = c.note;
      return card as RawCard;
    });
    const lesson: { name: string; cards: RawCard[]; notes?: string; timeline?: boolean } = { name: l.name, cards };
    if (l.notes.trim() !== '') lesson.notes = l.notes;
    if (l.timeline) lesson.timeline = true;
    return lesson as RawLesson;
  });
  const out: {
    curriculum: string; label: string; lessons: RawLesson[];
    audio?: boolean; voice?: string; piperVoice?: string;
  } = { curriculum: s.curriculum, label: s.label, lessons };
  if (s.audio) out.audio = true;
  if (s.voice.trim() !== '') out.voice = s.voice;
  if (s.piperVoice.trim() !== '') out.piperVoice = s.piperVoice;
  return out as RawCurriculum;
}

export function fromRaw(raw: RawCurriculum): EditCurriculum {
  return {
    curriculum: raw.curriculum,
    label: raw.label,
    audio: raw.audio ?? false,
    voice: raw.voice ?? '',
    piperVoice: raw.piperVoice ?? '',
    lessons: raw.lessons.map(l => ({
      name: l.name,
      notes: l.notes ?? '',
      timeline: l.timeline ?? false,
      collapsed: false,
      cards: l.cards.map(c => ({
        key: joinAliases(c.key),
        value: joinAliases(c.value),
        note: c.note ?? '',
      })),
    })),
  };
}
