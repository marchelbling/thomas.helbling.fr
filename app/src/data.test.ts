import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSession, normalize, parseCurriculum, shuffle, toArray } from './data.js';
import type { Direction, RawCurriculum } from './types.js';

test('normalize strips accents, lowercases, trims', () => {
  assert.equal(normalize('  Héllo  '), 'hello');
  assert.equal(normalize('Château'), 'chateau');
  assert.equal(normalize('ESPAÑA'), 'espana');
});

test('toArray wraps single string', () => {
  assert.deepEqual(toArray('hi'), ['hi']);
  assert.deepEqual(toArray(['a', 'b']), ['a', 'b']);
});

test('parseCurriculum normalizes card shapes', () => {
  const raw: RawCurriculum = {
    curriculum: 'english', label: 'Anglais', audio: true, voice: 'en_US',
    lessons: [{
      name: 'L1',
      cards: [
        { key: 'chat', value: 'cat' },
        { key: ['bonjour', 'salut'], value: ['hello', 'hi'] },
      ],
    }],
  };
  const c = parseCurriculum(raw);
  assert.equal(c.audio, true);
  assert.deepEqual(c.lessons[0]!.cards[0]!.key, ['chat']);
  assert.deepEqual(c.lessons[0]!.cards[1]!.value, ['hello', 'hi']);
});

test('parseCurriculum defaults audio to false', () => {
  const raw: RawCurriculum = {
    curriculum: 'history', label: 'Histoire',
    lessons: [{ name: 'L1', cards: [{ key: '1789', value: 'Révolution' }] }],
  };
  assert.equal(parseCurriculum(raw).audio, false);
});

test('shuffle returns a permutation', () => {
  const arr = [1, 2, 3, 4, 5];
  const r = shuffle(arr);
  assert.equal(r.length, arr.length);
  assert.deepEqual([...r].sort(), [...arr].sort());
});

test('buildSession respects size and assigns direction', () => {
  const cards = Array.from({ length: 20 }, (_, i) => ({ key: [`k${i}`], value: [`v${i}`] }));
  const fixed: Direction = 'key-to-value';
  const s = buildSession(cards, 15, () => fixed);
  assert.equal(s.length, 15);
  assert.ok(s.every(e => e.direction === 'key-to-value'));
});

test('buildSession caps to pool size', () => {
  const cards = [{ key: ['a'], value: ['b'] }];
  const s = buildSession(cards, 15);
  assert.equal(s.length, 1);
});
