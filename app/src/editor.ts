import type { RawCard, RawCurriculum, RawLesson } from './types.js';
import { renderMarkdown } from './markdown.js';
import { CURRICULA } from './curricula.js';

interface EditCard {
  key: string;
  value: string;
  note: string;
}
interface EditLesson {
  name: string;
  notes: string;
  timeline: boolean;
  cards: EditCard[];
}
interface EditCurriculum {
  curriculum: string;
  label: string;
  audio: boolean;
  voice: string;
  piperVoice: string;
  lessons: EditLesson[];
}

const state: EditCurriculum = emptyCurriculum();

function emptyCurriculum(): EditCurriculum {
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

function toRaw(s: EditCurriculum): RawCurriculum {
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

function fromRaw(raw: RawCurriculum): EditCurriculum {
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
      cards: l.cards.map(c => ({
        key: joinAliases(c.key),
        value: joinAliases(c.value),
        note: c.note ?? '',
      })),
    })),
  };
}

const root = document.querySelector<HTMLElement>('#app')!;

let jsonPreviewEl: HTMLElement | null = null;

function refreshJsonPreview(): void {
  if (!jsonPreviewEl) return;
  try {
    jsonPreviewEl.textContent = JSON.stringify(toRaw(state), null, 2);
  } catch (err) {
    jsonPreviewEl.textContent = 'Erreur : ' + (err as Error).message;
  }
}

function render(): void {
  root.innerHTML = '';
  root.append(
    h('h1', {}, ['Éditeur de révisions']),
    renderToolbar(), renderMeta(), renderLessons(), renderFooter(),
  );
  refreshJsonPreview();
}

document.addEventListener('input', () => refreshJsonPreview());
document.addEventListener('change', () => refreshJsonPreview());

function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Partial<HTMLElementTagNameMap[K]> & { className?: string } = {},
  children: (Node | string)[] = [],
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  Object.assign(el, props);
  for (const c of children) el.append(c);
  return el;
}

function labeledInput(
  label: string,
  value: string,
  onInput: (v: string) => void,
  opts: { type?: string; placeholder?: string } = {},
): HTMLElement {
  const input = h('input', {
    type: opts.type ?? 'text',
    value,
    placeholder: opts.placeholder ?? '',
  });
  input.addEventListener('input', () => onInput(input.value));
  return h('label', { className: 'field' }, [h('span', {}, [label]), input]);
}

function labeledTextarea(
  label: string,
  value: string,
  onInput: (v: string) => void,
  rows = 4,
): HTMLElement {
  const ta = h('textarea', { value, rows });
  ta.addEventListener('input', () => { onInput(ta.value); updatePreview(); });
  const preview = h('div', { className: 'md-preview' });
  preview.innerHTML = value.trim() ? renderMarkdown(value) : '<em class="muted">(aperçu)</em>';
  const updatePreview = (): void => {
    preview.innerHTML = ta.value.trim() ? renderMarkdown(ta.value) : '<em class="muted">(aperçu)</em>';
  };
  return h('label', { className: 'field' }, [
    h('span', {}, [label]),
    ta,
    preview,
  ]);
}

function renderToolbar(): HTMLElement {
  const loadBtn = h('button', { type: 'button' }, ['Charger un JSON…']);
  const fileInput = h('input', { type: 'file', accept: '.json' });
  fileInput.style.display = 'none';
  loadBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    const f = fileInput.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const raw = JSON.parse(String(reader.result)) as RawCurriculum;
        Object.assign(state, fromRaw(raw));
        render();
      } catch (err) {
        alert('JSON invalide : ' + (err as Error).message);
      }
    };
    reader.readAsText(f);
  });

  const downloadBtn = h('button', { type: 'button', className: 'primary' }, ['Télécharger data.json']);
  downloadBtn.addEventListener('click', () => {
    const json = JSON.stringify(toRaw(state), null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = h('a', { href: url, download: (state.curriculum || 'data') + '.json' });
    a.click();
    URL.revokeObjectURL(url);
  });

  const newBtn = h('button', { type: 'button' }, ['Nouveau']);
  newBtn.addEventListener('click', () => {
    if (!confirm('Effacer le contenu actuel ?')) return;
    Object.assign(state, emptyCurriculum());
    render();
  });

  const remoteSelect = h('select') as HTMLSelectElement;
  remoteSelect.append(h('option', { value: '' }, ['Charger depuis le site…']));
  for (const c of CURRICULA) {
    remoteSelect.append(h('option', { value: c.key }, [c.label]));
  }
  remoteSelect.addEventListener('change', async () => {
    const key = remoteSelect.value;
    if (!key) return;
    try {
      const res = await fetch(`/${key}/data.json`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const raw = await res.json() as RawCurriculum;
      Object.assign(state, fromRaw(raw));
      render();
    } catch (err) {
      alert('Chargement impossible : ' + (err as Error).message);
      remoteSelect.value = '';
    }
  });

  return h('div', { className: 'toolbar' }, [loadBtn, fileInput, remoteSelect, newBtn, downloadBtn]);
}

function renderMeta(): HTMLElement {
  const section = h('section', { className: 'section' }, [h('h2', {}, ['Matière'])]);
  section.append(
    labeledInput('Identifiant (ex: english)', state.curriculum, v => { state.curriculum = v; }),
    labeledInput('Libellé (ex: Anglais)', state.label, v => { state.label = v; }),
  );
  const audio = h('input', { type: 'checkbox', checked: state.audio });
  audio.addEventListener('change', () => { state.audio = audio.checked; });
  section.append(h('label', { className: 'field inline' }, [audio, h('span', {}, ['Audio'])]));
  section.append(
    labeledInput('Voix (ex: en-US)', state.voice, v => { state.voice = v; }),
    labeledInput('Voix Piper (optionnel)', state.piperVoice, v => { state.piperVoice = v; }),
  );
  return section;
}

function renderLessons(): HTMLElement {
  const section = h('section', { className: 'section' }, [h('h2', {}, ['Leçons'])]);
  state.lessons.forEach((lesson, idx) => section.append(renderLesson(lesson, idx)));
  const addBtn = h('button', { type: 'button' }, ['+ Ajouter une leçon']);
  addBtn.addEventListener('click', () => {
    state.lessons.push({ name: 'Nouvelle leçon', notes: '', timeline: false, cards: [] });
    render();
  });
  section.append(addBtn);
  return section;
}

function renderLesson(lesson: EditLesson, idx: number): HTMLElement {
  const box = h('div', { className: 'lesson-box' });
  const header = h('div', { className: 'lesson-header' });
  const nameInput = h('input', { type: 'text', value: lesson.name, className: 'lesson-name' });
  nameInput.addEventListener('input', () => { lesson.name = nameInput.value; });
  const up = h('button', { type: 'button', className: 'small' }, ['↑']);
  up.addEventListener('click', () => {
    if (idx === 0) return;
    [state.lessons[idx - 1], state.lessons[idx]] = [state.lessons[idx]!, state.lessons[idx - 1]!];
    render();
  });
  const down = h('button', { type: 'button', className: 'small' }, ['↓']);
  down.addEventListener('click', () => {
    if (idx === state.lessons.length - 1) return;
    [state.lessons[idx + 1], state.lessons[idx]] = [state.lessons[idx]!, state.lessons[idx + 1]!];
    render();
  });
  const del = h('button', { type: 'button', className: 'small danger' }, ['Supprimer']);
  del.addEventListener('click', () => {
    if (!confirm(`Supprimer la leçon « ${lesson.name} » ?`)) return;
    state.lessons.splice(idx, 1);
    render();
  });
  header.append(nameInput, up, down, del);
  box.append(header);

  const timelineToggle = h('input', { type: 'checkbox', checked: lesson.timeline });
  timelineToggle.addEventListener('change', () => { lesson.timeline = timelineToggle.checked; });
  box.append(h('label', { className: 'field inline' }, [
    timelineToggle,
    h('span', {}, ['Frise chronologique (les clés doivent être des dates : AAAA, AAAA-MM, AAAA-MM-JJ, « - » pour av. J.-C.)']),
  ]));

  box.append(labeledTextarea(
    'Notes de la leçon (markdown + LaTeX $…$)',
    lesson.notes,
    v => { lesson.notes = v; },
    5,
  ));

  const cardsTable = h('div', { className: 'cards' });
  lesson.cards.forEach((card, cIdx) => cardsTable.append(renderCard(lesson, card, cIdx)));
  const addCard = h('button', { type: 'button', className: 'small' }, ['+ Ajouter une carte']);
  addCard.addEventListener('click', () => {
    lesson.cards.push({ key: '', value: '', note: '' });
    render();
  });
  box.append(cardsTable, addCard);
  return box;
}

function renderCard(lesson: EditLesson, card: EditCard, idx: number): HTMLElement {
  const row = h('div', { className: 'card-row' });
  const k = h('input', { type: 'text', value: card.key, placeholder: 'clé (alias séparés par /)' });
  k.addEventListener('input', () => { card.key = k.value; });
  const v = h('input', { type: 'text', value: card.value, placeholder: 'valeur (alias séparés par /)' });
  v.addEventListener('input', () => { card.value = v.value; });
  const n = h('input', { type: 'text', value: card.note, placeholder: 'indice (optionnel, markdown)' });
  n.addEventListener('input', () => { card.note = n.value; });
  const del = h('button', { type: 'button', className: 'small danger' }, ['×']);
  del.addEventListener('click', () => {
    lesson.cards.splice(idx, 1);
    render();
  });
  row.append(k, v, n, del);
  return row;
}

function renderFooter(): HTMLElement {
  const foot = h('section', { className: 'section' });
  const pre = h('pre', { className: 'json-preview' });
  jsonPreviewEl = pre;
  foot.append(h('h2', {}, ['Aperçu JSON']), pre);
  return foot;
}

render();
