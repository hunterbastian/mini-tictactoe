Original prompt: great! lets get to building. i kinda wanna do a complete redesign and recode like a version 2.0 in a way with better graphics and more neomorphism

- Initialized V2 effort.
- Decision: full rewrite of HTML/CSS/JS for cleaner architecture and stronger neumorphic visual direction.
- Next: implement new layout, theme system, game logic, and test hooks (`render_game_to_text`, `advanceTime`).

- Replaced UI with a new V2 neomorphic shell and responsive layout.
- Rewrote game logic from scratch with cleaner state transitions, keyboard + mouse controls, and AI modes (easy/medium/hard).
- Added canvas rendering with animated marks, hover previews, and animated winning line.
- Added test hooks: `window.render_game_to_text` and deterministic `window.advanceTime(ms)`.
- Iteration request: reduce heavy neumorphism; blend back toward V1 minimal vibe.
- Updated to a Nord-inspired dark mode theme with subtle depth (lighter shadows, cleaner borders, flatter controls).
- Retuned canvas rendering palette and highlights to match Nord dark aesthetic.
- Validation pass complete on `file:///.../index.html` with output folder `output/web-game/nord-pass`.
- `render_game_to_text` and screenshots match expected state transitions for move sequence.
- No console/page errors in this run.
- User requested smaller overall UI scale.
- Reduced layout width, spacing, paddings, typography, control sizes, and board container footprint in `style.css`.
- Verified with Playwright file-url run (`output/web-game/compact-pass`): state updates correct, no errors.
