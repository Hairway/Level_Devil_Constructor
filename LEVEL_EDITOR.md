# Level Devil — editing levels

The playable runs on the studio **IMPION** template (webpack, PixiJS v8). The
level itself lives in one file:

    src/level.json

This is a `PlayableProject` (`{ id, name, runs: [{ name, config }] }`) where each
`config` holds `objects`, `triggers`, spawn/door positions, colors and tuning.
`src/Game.mjs` imports it as the source of truth. (You can also override it at
preview time via the `levelData` param in `index.html`; leave that empty to use
the file.)

## Designing a level in the constructor

The visual editor lives under `legacy-constructor/` (React/Vite). Run it
separately:

    cd legacy-constructor
    npm install
    npm run dev            # http://localhost:3000

Design your runs/objects/triggers there. The project uses the exact same shape
and the **same 800×328 coordinate space** as the template, so it drops in
unchanged.

## Applying a level

**One click (dev server running):** press **Export to IMPION template** in the
Import/Export panel. It writes the active project straight to `../src/level.json`
via the constructor's `/api/export-level` endpoint. Then rebuild the template.

**Manual:** use **Copy Project JSON** (or JSON File), paste into `src/level.json`.

Then rebuild / re-run the template from the repo root:

       npm run build        # single inlined build/index.html (+ zip)
       # or: npm run dev    # live dev server on http://localhost:8080

## Object fields (reference)

`objects[]`: `id, type` (`spike|saw|pit|fallingBlock|crusher|laser|platform|button`),
`x, y, width, height, label, initiallyActive`, optional `role`
(`hazard|solid|pit|decor`), `color` (hex), `appearDelay`, `clickable`,
`spriteUrl`, `action` (`{ kind, targetId }`), and `motion`
(`{ mode: static|linear|chase|fall, target, speed, dirX, dirY, distance, loop, startOn, delay }`).

`triggers[]`: `id, x, y, width, height, targetId, action, label`.
Actions: `activate, openPit, splitFloor, collapseFloor, startDoorChase, nextRun, redirectCTA`.
