export default class StatisticManager {
	
	#app;

	list = {};
	
	//------------------------------------------------------------------------
	
    constructor({app}){
		this.#app = app;
	}
 
	handlerEvent( eventName ){	
		//if(this.list[eventName] && eventName != "CTA_CLICKED"){ return; }
		
		this.list[eventName] = true;
		
		if(this.#app.params.modeClicks.value != 1 && this.#app.params.modeClicks.value != 2 && typeof window.ALPlayableAnalytics != 'undefined'){
			if(eventName == "CHALLENGE_SOLVED"){
				if(!this.list["CHALLENGE_PASS_25"]){
					this.list["CHALLENGE_PASS_25"] = true;
					window.ALPlayableAnalytics.trackEvent("CHALLENGE_PASS_25");
				}
				
				if(!this.list["CHALLENGE_PASS_50"]){
					this.list["CHALLENGE_PASS_50"] = true;
					window.ALPlayableAnalytics.trackEvent("CHALLENGE_PASS_50");
				}
				
				if(!this.list["CHALLENGE_PASS_75"]){
					this.list["CHALLENGE_PASS_75"] = true;
					window.ALPlayableAnalytics.trackEvent("CHALLENGE_PASS_75");
				}
			}
			
			if(eventName == "CHALLENGE_PASS_50"){
				if(!this.list["CHALLENGE_PASS_25"]){
					this.list["CHALLENGE_PASS_25"] = true;
					window.ALPlayableAnalytics.trackEvent("CHALLENGE_PASS_25");
				}
			}
			
			if(eventName == "CHALLENGE_PASS_75"){
				if(!this.list["CHALLENGE_PASS_25"]){
					this.list["CHALLENGE_PASS_25"] = true;
					window.ALPlayableAnalytics.trackEvent("CHALLENGE_PASS_25");
				}
				
				if(!this.list["CHALLENGE_PASS_50"]){
					this.list["CHALLENGE_PASS_50"] = true;
					window.ALPlayableAnalytics.trackEvent("CHALLENGE_PASS_50");
				}
			}
			
			window.ALPlayableAnalytics.trackEvent(eventName);
		}
	}
 }