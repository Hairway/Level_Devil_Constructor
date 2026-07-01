
				/*marker_platform@start*/
				var platform = {};

				platform.load = function(onCompleteLoad){
					/*marker_load@start*/
					if(document.readyState === 'complete'){
						onCompleteLoad();			
					}else{
						window.addEventListener('DOMContentLoaded', onCompleteLoad);
					}
					/*marker_load@end*/
				}

				platform.init = function(){
					/*marker_init@start*/
					/*marker_init@end*/	
				}
					
				platform.end = function(){
					/*marker_endgame@start*/
					/*marker_endgame@end*/
				}
				
				platform.handlerTap = function( numClicks ){
					/*marker_numclicks@start*/
					
				}
				
				platform.clickAd = function(e){
					globalThis.playable.statisticManager.handlerEvent("CTA_CLICKED");
					
					/*marker_click@start*/
					
					try{
						if((/iphone|ipad|ipod/i).test(window.navigator.userAgent.toLowerCase())) {						
							window.open( params.linkIOS.value );
						}else{
							window.open( params.linkAndroid.value );
						}
						
					}catch(e){}
					
					/*marker_click@end*/
				}
				/*marker_extra@start*/	
				/*marker_platform@end*/	
				