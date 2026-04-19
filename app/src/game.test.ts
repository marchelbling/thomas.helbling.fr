import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  accepted, addScore, advance, checkAnswer, createGame, current, expected,
  isDone, markFailed, prompt,
} from './game.js';
import type { Card, SessionEntry } from './types.js';

const card: Card = { key: ['bonjour', 'salut'], value: ['hello', 'hi'] };

test('prompt uses canonical of asked side', () => {
  assert.equal(prompt(card, 'key-to-value'), 'bonjour');
  assert.equal(prompt(card, 'value-to-key'), 'hello');
});

test('accepted returns the other side', () => {
  assert.deepEqual(accepted(card, 'key-to-value'), ['hello', 'hi']);
  assert.deepEqual(accepted(card, 'value-to-key'), ['bonjour', 'salut']);
});

test('expected returns canonical answer', () => {
  assert.equal(expected(card, 'key-to-value'), 'hello');
});

const entryK: SessionEntry = { card, direction: 'key-to-value' };
const entryV: SessionEntry = { card, direction: 'value-to-key' };

test('checkAnswer accepts any synonym, case/accent-insensitive', () => {
  assert.ok(checkAnswer(entryK, 'hello'));
  assert.ok(checkAnswer(entryK, 'HI'));
  assert.ok(checkAnswer(entryK, '  Hello  '));
  assert.ok(!checkAnswer(entryK, 'bye'));
});

test('checkAnswer key side accepts synonyms', () => {
  assert.ok(checkAnswer(entryV, 'bonjour'));
  assert.ok(checkAnswer(entryV, 'salut'));
  assert.ok(checkAnswer(entryV, 'Bonjour'));
});

test('checkAnswer: accent-insensitive', () => {
  const c: Card = { key: ['fenêtre'], value: ['window'] };
  const e: SessionEntry = { card: c, direction: 'value-to-key' };
  assert.ok(checkAnswer(e, 'fenetre'));
  assert.ok(checkAnswer(e, 'FENÊTRE'));
});

test('checkAnswer rejects empty', () => {
  assert.ok(!checkAnswer(entryK, ''));
  assert.ok(!checkAnswer(entryK, '   '));
});

test('game state progression', () => {
  const entries: SessionEntry[] = [entryK, entryV];
  let s = createGame(entries);
  assert.equal(s.total, 2);
  assert.equal(current(s), entryK);
  s = addScore(s);
  s = advance(s);
  assert.equal(s.index, 1);
  assert.equal(s.score, 1);
  assert.deepEqual(s.results, ['correct']);
  s = markFailed(s);
  assert.equal(s.failed, true);
  s = advance(s);
  assert.deepEqual(s.results, ['correct', 'wrong']);
  assert.equal(s.failed, false);
  assert.ok(isDone(s));
});
