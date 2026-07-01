// Shared Level Devil constants/helpers used by CreateObjects2D and Game (no engine imports).
// The level is authored in the legacy 800x328 coordinate space inside a scaled/centered LevelRoot,
// so the platformer logic ported from the constructor engine works almost verbatim.

export const VIEW_W = 800;
export const VIEW_H = 328;
export const GROUND_Y = 280;
export const BAND_TOP = 0;
export const PLAYER_H = 36;
export const PLAYER_W = 20;
export const DOOR_W = 40;
export const DOOR_H = 56;
export const DOOR_CY = -DOOR_H / 2;

export const COL_INK = 0x231708;
export const DEFAULT_BG = '#c77b00';
export const DEFAULT_GROUND = '#e2a33c';

// Parse "#rrggbb" (or a number) into a 0xRRGGBB number.
export const hx = (v, fallback) => {
	if (typeof v === 'number') return v;
	if (typeof v === 'string' && v[0] === '#') {
		const s = v.slice(1);
		const full = s.length === 3 ? s.split('').map((c) => c + c).join('') : s;
		const n = parseInt(full, 16);
		return Number.isFinite(n) ? n : fallback;
	}
	return fallback;
};

export const lightenNum = (n, amt) => {
	const r = Math.min(255, Math.round(((n >> 16) & 255) + 255 * amt));
	const g = Math.min(255, Math.round(((n >> 8) & 255) + 255 * amt));
	const b = Math.min(255, Math.round((n & 255) + 255 * amt));
	return (r << 16) | (g << 8) | b;
};

// Default collision role per object type (matches legacy objectModel.ts).
const ROLE = {
	spike: 'hazard', saw: 'hazard', fallingBlock: 'hazard', crusher: 'hazard', laser: 'hazard',
	pit: 'pit', platform: 'solid', button: 'decor',
};
export const roleOf = (o) => o.role || ROLE[o.type] || 'decor';

export const isBottomAnchored = (type) => type === 'spike' || type === 'pit';

// Motion config for an object (falling blocks default to fall-on-trigger; others static-on-spawn).
export const motionOf = (o) => {
	if (o.motion) return o.motion;
	if (o.type === 'fallingBlock') {
		return { mode: 'fall', target: 'player', speed: 2, dirX: 1, dirY: 0, distance: 0, loop: false, startOn: 'trigger', delay: 0 };
	}
	return { mode: 'static', target: 'player', speed: 2, dirX: 1, dirY: 0, distance: 0, loop: false, startOn: 'spawn', delay: 0 };
};

// Local rect (origin at the object's position anchor) — matches legacy objectLocalRect.
export const objectLocalRect = (o) => {
	if (isBottomAnchored(o.type)) return { x: -o.width / 2, y: -o.height, w: o.width, h: o.height };
	return { x: -o.width / 2, y: -o.height / 2, w: o.width, h: o.height };
};

export const rectsOverlap = (ax, ay, aw, ah, bx, by, bw, bh) =>
	ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;

export const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
