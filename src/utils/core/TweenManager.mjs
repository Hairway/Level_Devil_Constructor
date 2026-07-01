import * as IMPION from "#impion";

export default class TweenManager {
	#app;

	constructor({app}) {
		this.#app = app;		
	}
	
	init(){
		this.globalTimeline = IMPION.gsap.globalTimeline;
	}
	
	//-

	to(target, vars) {
		return IMPION.gsap.to(target, vars);
	}

	from(target, vars) {
		return IMPION.gsap.from(target, vars);
	}

	fromTo(target, fromVars, toVars) {
		return IMPION.gsap.fromTo(target, fromVars, toVars);
	}

	set(target, vars) {
		return IMPION.gsap.set(target, vars);
	}

	delayedCall(delay, callback, params = [], scope) {
		return IMPION.gsap.delayedCall(delay, callback, params, scope);
	}

	killTweensOf(target, onlyActive) {
		IMPION.gsap.killTweensOf(target, onlyActive);
	}

	getTweensOf(target, onlyActive) {
		return IMPION.gsap.getTweensOf(target, onlyActive);
	}

	//-

	timeline(vars = {}) {
		return IMPION.gsap.timeline(vars);
	}

	globalTimelinePlay() {
		this.globalTimeline.play();
	}

	globalTimelineResume() {
		this.globalTimeline.resume();
	}

	globalTimelinePause() {
		this.globalTimeline.pause();
	}

	globalTimelineSeek(time) {
		this.globalTimeline.seek(time);
	}

	globalTimelineClear() {
		this.globalTimeline.clear();
	}

	globalTimelineTimeScale(scale) {
		this.globalTimeline.timeScale(scale);
	}

	//-

	parseEase(ease) {
		return IMPION.gsap.parseEase(ease);
	}

	utils() {
		return IMPION.gsap.utils;
	}

	context(callback, scope) {
		return IMPION.gsap.context(callback, scope);
	}

	//-

	registerPlugin(...plugins) {
		IMPION.gsap.registerPlugin(...plugins);
	}

	//-

	tick(callback) {
		IMPION.gsap.ticker.add(callback);
	}

	removeTick(callback) {
		IMPION.gsap.ticker.remove(callback);
	}
}
