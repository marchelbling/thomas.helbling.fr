# Thomas — revision pages

Flashcard-style app to revise curricula (e.g. foreign-language vocabulary,
history dates…).

The flow: curriculum picker → lesson picker (with "random across all lessons")
→ 15-question session. For each card, we randomly hide the key or the value
and display the other. Answer matching is case- and accent-insensitive, and
accepts any listed synonym.

## Layout

```
app/                   TypeScript source + audio-generation script
  src/                 game logic, TTS wrapper, UI
  scripts/             generate_audio.py (Piper TTS)
public/                served as static files
  index.html
  js/                  tsc output (gitignored)
  <curriculum>/
    data.json          lessons + cards
    audio/             generated .ogg files + index.json (audio curricula only)
```

## Data format

`public/<curriculum>/data.json`:

```json
{
  "curriculum": "english",
  "label": "Anglais",
  "audio": true,
  "voice": "en-US",
  "piperVoice": "en_US-lessac-medium", # see https://rhasspy.github.io/piper-samples/
  "lessons": [
    {
      "name": "Leçon 1",
      "cards": [
        { "key": "chat", "value": "cat" },
        { "key": ["bonjour", "salut"], "value": ["hello", "hi"] }
      ]
    }
  ]
}
```

Either side of a card can be a string or an array. The first entry is the
canonical form (prompt / expected answer); any entry is accepted as a valid
answer.

`audio` opts the curriculum into TTS playback. When true, set `voice`
(BCP-47 tag used by the browser's Web Speech fallback) and `piperVoice`
(Piper model name, e.g. `en_US-lessac-medium`; the HuggingFace URL is
derived from the name). Omit `audio` or set it to `false` for curricula
that don't need sound, e.g. history.

## Adding a new curriculum

1. **Pick a key** — lowercase, URL-safe (`history`, `english`, `biologie`…).
   This is the folder name and the value of the `"curriculum"` field.
2. **Create the data file** at `public/<key>/data.json` following the schema
   above. Minimum: `curriculum`, `label` (shown in the picker), one lesson
   with at least one card. Set `"audio": false` (or omit) for text-only
   curricula like history.
3. **Register it in the picker** — add an entry to `CURRICULA` in
   [app/src/main.ts](app/src/main.ts):
   ```ts
   { key: 'history', label: 'Histoire' }
   ```
4. **(Audio curricula only)** set `audio: true`, `voice`, and `piperVoice`
   in `data.json`, then run `make audio-<key>` to generate `.ogg` files.
   Commit the generated `public/<key>/audio/` so CI can deploy it.
5. **Verify locally** with `make local`, then push — the workflow deploys
   automatically.

### Tips on authoring cards

- Either side (`key` or `value`) can be a string or an array of synonyms.
  The first entry is shown as the prompt / expected answer; any entry is
  accepted when typed.
- The prompt direction is randomized per card, so both sides should make
  sense as a prompt. For dates ↔ events, put the date as `key` and the event
  as `value` — either can be asked.
- Matching is case- and accent-insensitive, so don't worry about `é` vs `e`.

## Commands

```
make build        # install deps, run tests, compile TS
make test
make audio        # generate audio for all audio curricula
make audio-en     # english only (also: audio-es)
make local        # build + serve public/ on http://localhost:8080
make generate     # build + stage docs/ for GitHub Pages
```

Audio generation requires [uv](https://docs.astral.sh/uv/) (the script is a
uv-script). Piper voice models are downloaded on first run into
`app/scripts/.piper-models/`.

## Deployment

Pushes to `main` trigger `.github/workflows/deploy.yml`, which runs
`make generate` and deploys `docs/` via the GitHub Pages Actions artifact.

In the repo settings, set **Pages → Source → GitHub Actions** and add
`thomas.helbling.fr` as the custom domain (the workflow writes the CNAME file
for you).
