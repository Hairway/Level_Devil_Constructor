export default class EventManager {
	
	#app;
	
	eventTarget = new EventTarget();
	
	constructor({app}){		
		this.#app = app;

		this.init();
	}	
	
	//------------------------------------------------------------------------
	
	init(){		
		this.#initEvents();
	}
	
	//------------------------------------------------------------------------
	
	postMessage(data){
		window.parent.postMessage(
			data,
			"*"
		);
	}
	
	//------------------------------------------------------------------------
	
	#initEvents(){
		if(this.#app.platformName == "preview"){
			window.addEventListener("message", (event) => {
				const data = event.data;

				if (data.type === "adrawer_button") {
					try{
						if(this.#app.components["Game"][data.value]){
							this.#app.components["Game"][data.value]();
						}
					}catch(e){}
				}else if (data.type === "adrawer_params") {
					
					this.#applyIncoming(data);
					
					try{
						this.#app.components["Game"].reloadParams();
					}catch(e){}
				}
			});
		}
	}
	
	//------------------------------------------------------------------------
			
	#applyIncoming(data){

		const target = this.#app.params;

		if (data.params) {
			const normalized = this.#normalizeIncoming(data.params, target);
			const processed = this.#app.processParams(normalized);
			this.#mergeParams(target, processed);
		}

		if (data.texts) {
			let lang = target.language?.value;

			if (typeof lang !== "string") {
				lang = "en";
			}

			lang = lang.toLowerCase();

			if (lang === "auto") {
				lang = (navigator.language || "en").toLowerCase();
			}

			if (!data.texts[lang]) {

				if (typeof lang === "string" && lang.includes("-")) {

					let base = lang.split("-")[0];
					let ext = lang.split("-")[1];

					if (base === "zh") {
						lang = (ext === "tw") ? "zh_tw" : "zh_cn";
					} else {
						lang = base;
					}
				}

				if (!data.texts[lang]) {
					lang = "en";
				}
			}

			const texts = data.texts[lang] || {};

			for (const key in texts) {
				if (!target[key]) continue;

				target[key].value = texts[key];
			}
		}
	}

	#normalizeIncoming(incoming, target){
		const result = {};

		for (const key in incoming) {
			const src = incoming[key];
			const dst = target[key];

			if (!dst) continue;

			if (dst && typeof dst === "object" && "type" in dst) {

				if (src && typeof src === "object" && src.value !== undefined) {
					result[key] = src;
				}
				else {
					result[key] = { value: src };
				}

			}

			else if (typeof src === "object" && !Array.isArray(src)) {
				result[key] = this.#normalizeIncoming(src, dst);
			}
		}

		return result;
	}

	#mergeParams(target, incoming){
		for (const key in incoming) {
			if (!target[key]) continue;

			const src = incoming[key];
			const dst = target[key];

			if (dst && typeof dst === "object" && "value" in dst) {
				dst.value = src.value;
			} 
			else if (typeof dst === "object") {
				this.#mergeParams(dst, src);
			}
		}
	}

	//------------------------------------------------------------------------
	
	dispatchEvent(name, options = {}){
		this.eventTarget.dispatchEvent(new CustomEvent(name, options));
	}
	
	addEventListener(name, fun){
		this.eventTarget.addEventListener(name, fun);
	}
	
	removeEventListener(name, fun){
		this.eventTarget.removeEventListener(name, fun);
	}
	
}