export default class LanguageManager {

	#language;
	
	#params;
	
	//------------------------------------------------------------------------
	
    constructor({params}){
		this.#params = params;
		this.#language = this.#getBrowserLanguage();
		
		if(this.#params.language.value != "auto"){
			this.#language = this.#params.language.value;
		}

		if(!globalThis.texts[this.#language]){		
			if(this.#language.indexOf("-") != -1){
				let langeuaeE = this.#language.split('-')[1];
				this.#language = this.#language.split('-')[0];	
				
				if(this.#language=="zh"){
					if(langeuaeE=="tw"){
						this.#language = "zh_tw";				
					}else{
						this.#language = "zh_cn";
					}		
				}
			}	
			
			if(!globalThis.texts[this.#language]){
				this.#language = "en";
			}
		}

		for(let i in globalThis.texts[this.#language]){
			if(!this.#params[i]){
				this.#params[i] = {type: 'text'};
			}	
			
			this.#params[i].value = globalThis.texts[this.#language][i];					
		}
    }

	//------------------------------------------------------------------------
	
	#getBrowserLanguage() {
		let nav = window.navigator;
		let browserLanguagePropertyKeys = ['language', 'browserLanguage', 'systemLanguage', 'userLanguage'];
		let i;
		let language;

		if (Array.isArray(nav.languages)) {
			for(i = 0; i < nav.languages.length; i++) {
				language = nav.languages[i];
				if (language && language.length) {
					return language.toLowerCase();
				}			
			}		
		}

		for (i = 0; i < browserLanguagePropertyKeys.length; i++) {
			language = nav[browserLanguagePropertyKeys[i]];
			if(language && language.length) {
				return language.toLowerCase();
			}
		}
		
		return null;
	};
}