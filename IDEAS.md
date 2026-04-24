# Ideas

Running list of future enhancements. Anything listed here is open; resolved
ideas get removed in the same commit that implements them. Keep entries
self-contained so a future session can pick one up cold without digging
through conversation history.

## History

### Full French date formatting on the Réviser page

**Motivation.** The current ISO keys (`1789-07-14`, `-52`) are great for
matching (flashcard answers are case/accent-insensitive and the string is
unambiguous) and for sorting, but they read awkwardly in a French revision
context. For some curricula — typically history — we'd prefer to display
`14 juillet 1789` or `52 av. J.-C.` while still keeping the ISO form as the
canonical key.

**Sketch.**
- Add an optional per-curriculum (or per-lesson) display flag, e.g.
  `"dateFormat": "fr-long"`, rather than hard-coding per card.
- In the timeline renderer and the plain review row, transform the
  displayed date when the flag is set. Keep `card.key[0]` as the matcher.
- Formatting rules: `YYYY` → `YYYY` (or `YYYY av. J.-C.` when negative);
  `YYYY-MM` → `<mois> YYYY`; `YYYY-MM-DD` → `<jour> <mois> YYYY`
  (`1er` for day 1). Month names: janvier, février, mars, avril, mai,
  juin, juillet, août, septembre, octobre, novembre, décembre.
- Flashcard prompt/answer logic is unchanged — the toggle only affects
  the Réviser display.

### Centuries/eras as bucket labels in non-French curricula

**Motivation.** Current bucket labels are hard-coded French
(`Décennie 1790`, `Vᵉ siècle ap. J.-C.`). If we ever add a non-French
history curriculum, we'll need to parameterize.

**Sketch.** Move the label strings into a small locale-bag keyed by the
curriculum's `locale` field (to add). Low priority until a second history
locale actually shows up.

## Geography

### Map-backed cards (real or illustrative)

**Motivation.** For geography curricula, a map is the natural visual
support: locating capitals, rivers, boundaries, or following the route of
an exploration. The Réviser page is the right home for it — same role as
the timeline plays for history.

**Sketch.**
- Use [Leaflet](https://leafletjs.com/) (~42 KB, MIT). Covers both use
  cases from a single API:
  - OSM tiles for real-world maps: `L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', …)`.
  - Static image "maps" (historical atlases, fantasy maps, labeled
    schemas) via `L.imageOverlay` + `CRS.Simple`, with pixel coordinates
    instead of lat/lng.
- Data model idea: add an optional `"map"` block on the lesson with
  `{ type: 'tiles' | 'image', src?, bounds?, center?, zoom? }`, and let
  cards attach a `"where"` with either `[lat, lng]` or `[x, y]`
  depending on the map type. Non-geo cards (definitions) coexist the
  same way they do alongside a timeline.
- Lazy-load Leaflet only when a lesson uses `map`, so vocabulary pages
  stay lean.
- Render mode: like the timeline, the map shows on the Réviser page
  with every card plotted; flashcard sessions stay visual-hint-free.

## Maths

### Interactive geometric figures

**Motivation.** For geometry lessons (constructions, theorems, angle
chases), a static SVG quickly becomes limiting — students benefit from
dragging a point and watching the rest of the figure update.

**Sketch.**
- [JSXGraph](https://jsxgraph.uni-bayreuth.de/) is purpose-built for
  school geometry (points, lines, circles, angles, sliders, loci,
  constructions). Pairs naturally with the KaTeX we already load for
  notes.
- Data model idea: a `"figure"` block on a card or lesson note, either
  inline JSXGraph JSON or a short declarative DSL that compiles to
  JSXGraph calls.
- Start small: static construction figures rendered in lesson notes
  (no per-card interactivity) are already a big win and won't need the
  data model work.
- Static SVG remains fine for simple diagrams — reserve JSXGraph for
  cases where interactivity pays off.

## UX / general

### Per-curriculum display preferences

**Motivation.** We're starting to accumulate display knobs (date format,
map type, figure preferences). They naturally belong on the curriculum
(or lesson) rather than sprinkled per card.

**Sketch.** Group them under a `"display"` object in `data.json`:
```json
"display": {
  "dateFormat": "fr-long"
}
```
This also gives the editor a clean place to surface toggles. Do this
refactor the first time a second display preference ships, not speculatively.
