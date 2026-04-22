import { TTS } from './tts.js';
import { buildSession, loadCurriculum } from './data.js';
import {
  addScore, advance, checkAnswer, createGame, current, isDone,
  markFailed, prompt,
} from './game.js';
import type { Card, Curriculum, GameState, Lesson } from './types.js';
import { renderMarkdown } from './markdown.js';
import { CURRICULA } from './curricula.js';

const screenEl = document.querySelector<HTMLElement>('#screen')!;
const scoreEl = document.querySelector<HTMLElement>('#score')!;
const progressEl = document.querySelector<HTMLElement>('#progress')!;

let tts: TTS | null = null;
let state: GameState;
let curriculum: Curriculum;
let answerEl: HTMLInputElement | null = null;
let listenBtnEl: HTMLButtonElement | null = null;

function clear(): void {
  screenEl.innerHTML = '';
  scoreEl.textContent = '';
  progressEl.innerHTML = '';
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
      () => renderReview(lesson.name, lesson.cards, lesson.notes),
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

function renderReview(title: string, cards: readonly Card[], notes?: string): void {
  clear();
  const h = document.createElement('h1');
  h.className = 'title';
  h.textContent = title;
  screenEl.appendChild(h);

  if (notes && notes.trim() !== '') {
    const notesEl = document.createElement('div');
    notesEl.className = 'lesson-notes';
    notesEl.innerHTML = renderMarkdown(notes);
    screenEl.appendChild(notesEl);
  }

  const table = document.createElement('div');
  table.className = 'review-list';
  for (const card of cards) {
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
