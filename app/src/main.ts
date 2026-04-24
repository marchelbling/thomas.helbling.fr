import { TTS } from './tts.js';
import { buildSession, loadCurriculum, parseDate } from './data.js';
import {
  addScore, advance, checkAnswer, createGame, current, isDone,
  markFailed, prompt,
} from './game.js';
import type { Card, Curriculum, GameState, Lesson } from './types.js';
import { renderMarkdown } from './markdown.js';
import { CURRICULA } from './curricula.js';

const screenEl = document.querySelector<HTMLElement>('#screen')!;
const scoreEl = document.querySelector<HTMLElement>('#score')!;
const exitEl = document.querySelector<HTMLElement>('#exit')!;
const progressEl = document.querySelector<HTMLElement>('#progress')!;
const editorLinkEl = document.querySelector<HTMLAnchorElement>('#editor-link')!;

let tts: TTS | null = null;
let state: GameState;
let curriculum: Curriculum;
let curriculumKey = '';
let answerEl: HTMLInputElement | null = null;
let listenBtnEl: HTMLButtonElement | null = null;

function clear(): void {
  screenEl.innerHTML = '';
  scoreEl.textContent = '';
  exitEl.innerHTML = '';
  progressEl.innerHTML = '';
  editorLinkEl.style.display = '';
  editorLinkEl.href = 'editor/';
}

function renderCurriculumPicker(): void {
  clear();
  const h = document.createElement('h1');
  h.className = 'title';
  h.textContent = 'Révisions';
  screenEl.appendChild(h);

  const p = document.createElement('p');
  p.className = 'subtitle';
  p.textContent = 'Choisis une matière';
  screenEl.appendChild(p);

  const row = document.createElement('div');
  row.className = 'choices';
  for (const c of CURRICULA) {
    const btn = document.createElement('button');
    btn.textContent = c.label;
    btn.addEventListener('click', () => { void pickCurriculum(c.key); });
    row.appendChild(btn);
  }
  screenEl.appendChild(row);
}

async function pickCurriculum(key: string): Promise<void> {
  try {
    curriculumKey = key;
    curriculum = await loadCurriculum(`./${key}/data.json`);
    tts = curriculum.audio && curriculum.voice
      ? new TTS(curriculum.voice, `./${key}/audio`)
      : null;
    renderLessonPicker();
  } catch (err) {
    console.error(err);
    screenEl.innerHTML = '<p>Erreur de chargement.</p>';
  }
}

function renderLessonPicker(): void {
  clear();
  const h = document.createElement('h1');
  h.className = 'title';
  h.textContent = curriculum.label;
  screenEl.appendChild(h);

  const p = document.createElement('p');
  p.className = 'subtitle';
  p.textContent = 'Choisis une leçon';
  screenEl.appendChild(p);

  const list = document.createElement('div');
  list.className = 'choices choices-col';

  list.appendChild(lessonRow(
    'Aléatoire (toutes les leçons)',
    () => startSession(allCards(curriculum.lessons)),
    () => renderReview('Toutes les leçons', allCards(curriculum.lessons)),
  ));

  for (const lesson of curriculum.lessons) {
    list.appendChild(lessonRow(
      lesson.name,
      () => startSession(lesson.cards),
      () => renderReview(lesson.name, lesson.cards, lesson.notes, lesson.timeline ?? false, lesson.name),
    ));
  }
  screenEl.appendChild(list);

  const back = document.createElement('button');
  back.className = 'back';
  back.textContent = '← Changer de matière';
  back.addEventListener('click', renderCurriculumPicker);
  screenEl.appendChild(back);
}

function allCards(lessons: readonly Lesson[]): Card[] {
  return lessons.flatMap(l => l.cards);
}

function lessonRow(name: string, onPlay: () => void, onReview: () => void): HTMLElement {
  const row = document.createElement('div');
  row.className = 'lesson-row';
  const play = document.createElement('button');
  play.textContent = name;
  play.addEventListener('click', onPlay);
  const review = document.createElement('button');
  review.className = 'review';
  review.textContent = 'Réviser';
  review.addEventListener('click', onReview);
  row.append(play, review);
  return row;
}

function renderReview(title: string, cards: readonly Card[], notes?: string, timeline = false, lessonName?: string): void {
  clear();
  if (curriculumKey) {
    let url = `editor/?curriculum=${curriculumKey}`;
    if (lessonName) url += `&lesson=${encodeURIComponent(lessonName)}`;
    editorLinkEl.href = url;
  }
  const h = document.createElement('h1');
  h.className = 'title review-title';
  h.textContent = title;
  screenEl.appendChild(h);

  if (notes && notes.trim() !== '') {
    const notesEl = document.createElement('div');
    notesEl.className = 'lesson-notes';
    notesEl.innerHTML = renderMarkdown(notes);
    screenEl.appendChild(notesEl);
  }

  let definitions: readonly Card[] = cards;
  if (timeline) {
    const dated: { card: Card; serial: number; year: number }[] = [];
    const rest: Card[] = [];
    for (const c of cards) {
      const p = parseDate(c.key[0]!);
      if (p !== null) dated.push({ card: c, serial: p.serial, year: p.year });
      else rest.push(c);
    }
    dated.sort((a, b) => a.serial - b.serial);
    if (dated.length > 0) screenEl.appendChild(renderTimeline(dated));
    definitions = rest;
    if (rest.length > 0) {
      const h2 = document.createElement('h2');
      h2.className = 'review-subheading';
      h2.textContent = 'Définitions';
      screenEl.appendChild(h2);
    }
  }

  const table = document.createElement('div');
  table.className = 'review-list';
  for (const card of definitions) {
    const row = document.createElement('div');
    row.className = 'review-row';
    const k = document.createElement('span');
    k.className = 'review-key';
    k.textContent = card.key.join(' / ');
    const sep = document.createElement('span');
    sep.className = 'review-sep';
    sep.textContent = '→';
    const v = document.createElement('span');
    v.className = 'review-value';
    v.textContent = card.value.join(' / ');
    row.append(k, sep, v);
    if (tts) {
      const listen = document.createElement('button');
      listen.className = 'review-listen';
      listen.type = 'button';
      listen.textContent = '🔊';
      listen.setAttribute('aria-label', 'Écouter');
      const word = card.value[0]!;
      listen.addEventListener('click', () => {
        listen.disabled = true;
        void tts!.speak(word).finally(() => { listen.disabled = false; });
      });
      v.append(' ', listen);
    }
    if (card.note && card.note.trim() !== '') {
      const note = document.createElement('div');
      note.className = 'card-note';
      note.innerHTML = renderMarkdown(card.note);
      row.appendChild(note);
    }
    table.appendChild(row);
  }
  screenEl.appendChild(table);

  const back = document.createElement('button');
  back.className = 'back';
  back.textContent = '← Retour';
  back.addEventListener('click', renderLessonPicker);
  screenEl.appendChild(back);
}

type BucketMode = 'year' | 'decade' | 'century';

function bucketMode(span: number): BucketMode {
  if (span <= 30) return 'year';
  if (span <= 300) return 'decade';
  return 'century';
}

// Century index: 1..N for AD (year 1..100 = century 1), -1..-N for BC, no 0.
function centuryIdx(y: number): number {
  return y > 0 ? Math.ceil(y / 100) : -Math.ceil(-y / 100);
}

function bucketIdx(mode: BucketMode, year: number): number {
  if (mode === 'year') return year;
  if (mode === 'decade') return Math.floor(year / 10);
  return centuryIdx(year);
}

const ROMAN: readonly [number, string][] = [
  [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
  [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
  [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
];
function toRoman(n: number): string {
  let s = '';
  let r = Math.abs(n);
  for (const [v, g] of ROMAN) { while (r >= v) { s += g; r -= v; } }
  return s;
}

function bucketLabel(mode: BucketMode, idx: number): string {
  if (mode === 'year') {
    return idx < 0 ? `${-idx} av. J.-C.` : String(idx);
  }
  if (mode === 'decade') {
    const start = Math.abs(idx) * 10;
    return idx < 0 ? `Décennie ${start} av. J.-C.` : `Décennie ${start}`;
  }
  const era = idx < 0 ? 'av. J.-C.' : 'ap. J.-C.';
  return `${toRoman(Math.abs(idx))}ᵉ siècle ${era}`;
}

// Separator label between previous-bucket `prev` and current-bucket `cur`
// (cur > prev). If the two buckets are adjacent, label with the incoming
// bucket; otherwise label with the range of skipped buckets, with 0 excluded
// from century mode (there is no year 0 century).
function separatorLabel(mode: BucketMode, prev: number, cur: number): string {
  if (cur - prev === 1) return bucketLabel(mode, cur);
  let from = prev + 1;
  let to = cur - 1;
  if (mode === 'century') {
    if (from === 0) from = 1;
    if (to === 0) to = -1;
  }
  if (from === to) return bucketLabel(mode, from);
  return `${bucketLabel(mode, from)} – ${bucketLabel(mode, to)}`;
}

function renderTimeline(dated: readonly { card: Card; serial: number; year: number }[]): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'timeline';

  const span = Math.abs(dated[dated.length - 1]!.year - dated[0]!.year);
  const mode = bucketMode(span);

  let prevBucket: number | null = null;
  for (const { card, year } of dated) {
    const b = bucketIdx(mode, year);
    if (prevBucket !== null && b !== prevBucket) {
      const sep = document.createElement('div');
      sep.className = 't-sep';
      const line1 = document.createElement('span');
      line1.className = 't-sep-line';
      const label = document.createElement('span');
      label.className = 't-sep-label';
      label.textContent = separatorLabel(mode, prevBucket, b);
      const line2 = document.createElement('span');
      line2.className = 't-sep-line';
      sep.append(line1, label, line2);
      wrap.appendChild(sep);
    }
    prevBucket = b;

    const row = document.createElement('div');
    row.className = 't-row';
    const date = document.createElement('span');
    date.className = 't-date';
    date.textContent = card.key[0]!;
    const axis = document.createElement('span');
    axis.className = 't-axis';
    const dot = document.createElement('span');
    dot.className = 't-dot';
    axis.appendChild(dot);
    const event = document.createElement('span');
    event.className = 't-event';
    event.textContent = card.value[0]!;
    row.append(date, axis, event);
    wrap.appendChild(row);
  }

  return wrap;
}

function startSession(cards: readonly Card[]): void {
  if (cards.length === 0) {
    screenEl.innerHTML = '<p>Aucune carte disponible.</p>';
    return;
  }
  state = createGame(buildSession(cards));
  renderPrompt();
}

function renderProgress(): void {
  const dots: string[] = [];
  for (let i = 0; i < state.total; i++) {
    const isPast = i < state.results.length;
    const cls = isPast
      ? state.results[i]!
      : i === state.index
        ? (state.failed ? 'wrong current' : 'current')
        : 'pending';
    let title = '';
    if (isPast) {
      const e = state.entries[i]!;
      title = ` title="${e.card.key[0]} → ${e.card.value[0]}"`;
    }
    dots.push(`<span class="dot ${cls}"${title}></span>`);
  }
  progressEl.innerHTML = dots.join('');
}

function renderPrompt(): void {
  clear();
  editorLinkEl.style.display = 'none';
  const entry = current(state);
  const isValuePrompt = entry.direction === 'value-to-key';

  const wordEl = document.createElement('div');
  wordEl.id = 'word';
  wordEl.textContent = prompt(entry.card, entry.direction);
  screenEl.appendChild(wordEl);

  const row = document.createElement('div');
  row.id = 'answer-row';
  const input = document.createElement('input');
  input.id = 'answer';
  input.type = 'text';
  input.autocomplete = 'off';
  input.autocapitalize = 'off';
  input.spellcheck = false;
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleSubmit(); });
  row.appendChild(input);
  answerEl = input;
  screenEl.appendChild(row);

  const controls = document.createElement('div');
  controls.id = 'controls';
  listenBtnEl = null;
  if (isValuePrompt && tts) {
    const listenBtn = document.createElement('button');
    listenBtn.id = 'listen';
    listenBtn.textContent = 'Écouter';
    listenBtn.addEventListener('click', () => void speakPrompt());
    controls.appendChild(listenBtn);
    listenBtnEl = listenBtn;
  }
  const submit = document.createElement('button');
  submit.textContent = 'Valider';
  submit.addEventListener('click', handleSubmit);
  controls.appendChild(submit);

  const skip = document.createElement('button');
  skip.className = 'skip';
  skip.textContent = 'Passer';
  skip.addEventListener('click', handleSkip);
  controls.appendChild(skip);
  screenEl.appendChild(controls);

  const exitBtn = document.createElement('button');
  exitBtn.className = 'exit';
  exitBtn.textContent = '✕';
  exitBtn.title = 'Quitter la session';
  exitBtn.addEventListener('click', () => { tts?.cancel(); renderLessonPicker(); });
  exitEl.appendChild(exitBtn);

  scoreEl.textContent = `${state.score} / ${state.total}`;
  renderProgress();
  input.focus();

  if (isValuePrompt && tts) void speakPrompt();
}

async function speakPrompt(): Promise<void> {
  if (!tts) return;
  const entry = current(state);
  if (entry.direction !== 'value-to-key') return;
  const btn = listenBtnEl;
  if (btn) btn.disabled = true;
  try {
    await tts.speak(entry.card.value[0]!);
  } finally {
    if (btn) btn.disabled = false;
  }
}

function onCorrect(): void {
  if (!state.failed) state = addScore(state);
  answerEl!.className = 'correct';
  answerEl!.disabled = true;
  scoreEl.textContent = `${state.score} / ${state.total}`;
  setTimeout(() => {
    state = advance(state);
    if (isDone(state)) showDone();
    else renderPrompt();
  }, 1200);
}

function onWrong(): void {
  state = markFailed(state);
  answerEl!.classList.remove('wrong');
  void answerEl!.offsetWidth;
  answerEl!.classList.add('wrong');
  renderProgress();
  answerEl!.select();
}

function showDone(): void {
  tts?.cancel();
  clear();
  const h = document.createElement('div');
  h.id = 'word';
  h.textContent = `Bravo ! ${state.score} / ${state.total}`;
  screenEl.appendChild(h);

  const again = document.createElement('button');
  again.textContent = 'Rejouer';
  again.addEventListener('click', renderLessonPicker);
  const home = document.createElement('button');
  home.textContent = 'Changer de matière';
  home.addEventListener('click', renderCurriculumPicker);
  const row = document.createElement('div');
  row.id = 'controls';
  row.appendChild(again);
  row.appendChild(home);
  screenEl.appendChild(row);

  scoreEl.textContent = '';
  renderProgress();
}

function handleSubmit(): void {
  if (!answerEl || isDone(state) || answerEl.classList.contains('correct')) return;
  if (answerEl.value.trim() === '') return;
  const entry = current(state);
  if (checkAnswer(entry, answerEl.value)) {
    onCorrect();
  } else {
    onWrong();
  }
}

function handleSkip(): void {
  if (!answerEl || isDone(state) || answerEl.classList.contains('correct')) return;
  const entry = current(state);
  state = markFailed(state);
  answerEl.value = entry.card[entry.direction === 'key-to-value' ? 'value' : 'key'][0]!;
  answerEl.classList.remove('wrong');
  answerEl.classList.add('skipped');
  answerEl.disabled = true;
  renderProgress();
  setTimeout(() => {
    state = advance(state);
    if (isDone(state)) showDone();
    else renderPrompt();
  }, 1500);
}

renderCurriculumPicker();
