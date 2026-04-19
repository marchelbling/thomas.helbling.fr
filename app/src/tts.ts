type AudioIndex = Record<string, string>;

export class TTS {
  private index: AudioIndex = {};
  private indexReady: Promise<void>;
  private currentAudio: HTMLAudioElement | null = null;
  private lang: string;
  private basePath: string;

  constructor(lang: string, basePath: string) {
    this.lang = lang;
    this.basePath = basePath.replace(/\/$/, '');
    this.indexReady = this.loadIndex();
  }

  private async loadIndex(): Promise<void> {
    try {
      const res = await fetch(`${this.basePath}/index.json`);
      if (res.ok) this.index = await res.json() as AudioIndex;
    } catch (e) {
      console.warn('Audio index unavailable:', e);
    }
  }

  async speak(text: string): Promise<void> {
    this.cancel();
    await this.indexReady;
    const slug = this.index[text];
    if (slug && await this.playFile(`${this.basePath}/${slug}.ogg`)) return;
    return this.speakFallback(text);
  }

  private playFile(url: string): Promise<boolean> {
    return new Promise(resolve => {
      const a = new Audio(url);
      this.currentAudio = a;
      a.onended = () => resolve(true);
      a.onerror = () => resolve(false);
      a.play().catch(() => resolve(false));
    });
  }

  private speakFallback(text: string): Promise<void> {
    return new Promise(resolve => {
      const utt = new SpeechSynthesisUtterance(text);
      utt.lang = this.lang;
      const voices = speechSynthesis.getVoices();
      const v = voices.find(v => v.lang.startsWith(this.lang));
      if (v) utt.voice = v;
      utt.onend = () => resolve();
      utt.onerror = () => resolve();
      speechSynthesis.speak(utt);
    });
  }

  cancel(): void {
    speechSynthesis.cancel();
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }
  }
}
