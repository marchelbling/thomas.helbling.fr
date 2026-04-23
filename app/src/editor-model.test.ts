import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fromRaw, toRaw } from './editor-model.js';
import type { Card, Curriculum, Lesson, RawCurriculum } from './types.js';

// A canonical fixture exercising every optional field in the schema.
// "Canonical" means: each field is in the exact shape toRaw() emits, so
// raw -> fromRaw -> toRaw must round-trip to deep-equal.
const FIXTURE: RawCurriculum = {
  curriculum: 'history',
  label: 'Histoire',
  audio: true,
  voice: 'fr-FR',
  piperVoice: 'fr_FR-siwis',
  lessons: [
    {
      name: 'Antiquité',
      notes: 'Intro **markdown**',
      timeline: true,
      cards: [
        { key: '-52', value: 'Alésia', note: 'indice' },
        { key: ['1789', '1789-07-14'], value: ['Révolution', 'prise de la Bastille'] },
      ],
    },
    {
      name: 'Leçon minimale',
      cards: [{ key: 'a', value: 'b' }],
    },
  ],
};

test('editor round-trip: toRaw(fromRaw(x)) === x for every schema field', () => {
  const roundTripped = toRaw(fromRaw(FIXTURE));
  assert.deepEqual(roundTripped, FIXTURE);
});

// Schema-drift guard: if someone adds a field to Curriculum / Lesson / Card in
// types.ts but forgets the editor, this test flags it. Whenever a field is
// intentionally added, update both the fixture above AND this key list.
test('editor round-trip fixture covers every schema field', () => {
  const curriculumKeys: (keyof Curriculum)[] =
    ['curriculum', 'label', 'audio', 'voice', 'piperVoice', 'lessons'];
  const lessonKeys: (keyof Lesson)[] = ['name', 'cards', 'notes', 'timeline'];
  const cardKeys: (keyof Card)[] = ['key', 'value', 'note'];

  const raw = FIXTURE as unknown as Record<string, unknown>;
  for (const k of curriculumKeys) {
    assert.ok(k in raw, `fixture missing Curriculum field: ${k}`);
  }
  // First lesson covers all Lesson fields.
  const l0 = FIXTURE.lessons[0]! as unknown as Record<string, unknown>;
  for (const k of lessonKeys) {
    assert.ok(k in l0, `fixture missing Lesson field: ${k}`);
  }
  // First card of first lesson covers all Card fields.
  const c0 = FIXTURE.lessons[0]!.cards[0]! as unknown as Record<string, unknown>;
  for (const k of cardKeys) {
    assert.ok(k in c0, `fixture missing Card field: ${k}`);
  }
});
