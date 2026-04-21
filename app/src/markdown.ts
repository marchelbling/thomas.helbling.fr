declare const marked: {
  parse(src: string): string;
  use(ext: unknown): void;
  setOptions?(opts: Record<string, unknown>): void;
};
declare const markedKatex: (opts?: Record<string, unknown>) => unknown;

let initialized = false;

function init(): void {
  if (initialized) return;
  if (typeof marked === 'undefined') return;
  if (typeof markedKatex !== 'undefined') {
    marked.use(markedKatex({ throwOnError: false }));
  }
  marked.setOptions?.({ breaks: true, gfm: true });
  initialized = true;
}

export function renderMarkdown(src: string): string {
  init();
  if (typeof marked === 'undefined') {
    const div = document.createElement('div');
    div.textContent = src;
    return div.innerHTML;
  }
  return marked.parse(src);
}
