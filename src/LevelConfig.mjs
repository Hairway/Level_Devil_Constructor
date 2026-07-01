// Shared Level Devil constants/helpers used by CreateObjects2D and Game (no engine imports).

// Design-space geometry (0,0 = screen center; fits 720x1280 / 1280x720).
export const LEVEL = {
	groundY		: 300,		// hero feet line
	floorBottom	: 660,
	corridorHalf: 340,
	heroW		: 44,
	heroH		: 54,
	doorW		: 52,
	doorH		: 74,
	spikeW		: 34,
	spikeH		: 30,
};

// Parse "#rrggbb" (or a number) into a 0xRRGGBB number.
export const hx = (v, fallback) => {
	if (typeof v === "number") return v;
	if (typeof v === "string" && v[0] === "#") {
		const s = v.slice(1);
		const full = s.length === 3 ? s.split("").map((c) => c + c).join("") : s;
		const n = parseInt(full, 16);
		return Number.isFinite(n) ? n : fallback;
	}
	return fallback;
};
