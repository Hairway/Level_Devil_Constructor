import * as IMPION from "#impion";

export default class Text2d extends IMPION.Component2d{

	textContainer;
	
	#text;
	#textOld = "";
	#styleFont;

	//------------------------------------------------------------------------

	constructor(
		text,
		styleFont
	){
		super();

		//-
		
		this.#text = text + "";
		
		this.#styleFont = Object.assign({
			fontFamily		: "Rubik Black",
			fontSize 		: 50,
			fontWeight 		: "normal",
			fill			: 0xffffff,
			align			: "center",
			valign			: "center",
			lineJoin		: 'round',
			lineCap			: 'round',
			letterSpacing	: 0,
			lineHeight		: 0,
			wordWrapWidth	: 1000,
			wordWrapHeight	: 1000,
			textBaseline	: "alphabetic", 
			wordWrap		: false,
		//	filters			: []
		}, styleFont);

		//-
		
		while(this.#text.indexOf("	") != -1){
			this.#text = this.#text.replace("	", "\n");
		}
		
		if(this.#styleFont.fontFamily.indexOf("sans-serif") == -1){
			this.#styleFont.fontFamily = this.#styleFont.fontFamily + ', sans-serif';
		}
		
		this.#styleFont.lineHeight = this.#styleFont.fontSize + this.#styleFont.lineHeight + 5;
		
		//-
		
		if(this.#styleFont.filters && this.#styleFont.filters.length == 0){
			this.#styleFont.filters = null
		}

		//-

		this.textContainer = new IMPION.Text2dBase({text: this.#text, style: this.#styleFont});
		
		if(this.#styleFont.align == "left"){
			this.textContainer.anchor.x = 0.0;
		}else if(this.#styleFont.align == "right"){
			this.textContainer.anchor.x = 1;
		}else{
			this.textContainer.anchor.x = 0.5;
		}
		
		if(this.#styleFont.valign == "top"){
			this.textContainer.anchor.y = 0.0;
		}else if(this.#styleFont.valign == "bottom"){
			this.textContainer.anchor.y = 1;
		}else{
			this.textContainer.anchor.y = 0.5;
		}
		
		//-
		
		this.setText( this.#text );

		if(this.#styleFont.filters && this.#styleFont.filters.length > 0){
			this.textContainer.filters = this.#styleFont.filters;
		}
		
		this.addChild( this.textContainer );
				
		//-

		return this;
    }

	//------------------------------------------------------------------------

	setFill = ( fill ) => {
		this.textContainer.style.fill = fill;
		
		return this;
	}

	setText = ( text ) => {

		this.#text = text + "";
		
		//- text
		
		while(this.#text.indexOf("	") != -1){
			this.#text = this.#text.replace("	", "\n");
		}
		
		this.textContainer.text = this.#text;
		
		//- width / height
		
		this.textContainer.scale.set(1);
		
		if(this.textContainer.width > this.#styleFont.wordWrapWidth){
			this.textContainer.scale.set( this.#styleFont.wordWrapWidth/this.textContainer.width*this.textContainer.scale.x );	
		}
		
		if(this.textContainer.height > this.#styleFont.wordWrapHeight){
			this.textContainer.scale.set( this.#styleFont.wordWrapHeight/this.textContainer.height*this.textContainer.scale.y );			
		}
		
		this.textContainer.x = 0;
		this.textContainer.y = 0;
		
		if(this.#styleFont.dropShadowDistance){
			this.textContainer.y += this.#styleFont.dropShadowDistance*0.5*this.textContainer.scale.y;
		}
		if(this.#styleFont.stroke){			
			this.textContainer.y += this.#styleFont.stroke.width*0.5*this.textContainer.scale.y;
		}
		
		return this;
	}

	//------------------------------------------------------------------------

    //enterframe = ( timeDelta )=>{
	//
    //}

	//------------------------------------------------------------------------

	//resize = (width, height)=>{
	//
	//}

}
