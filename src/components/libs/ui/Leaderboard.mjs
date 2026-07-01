import * as IMPION from "#impion";

export default class Leaderboard extends IMPION.Component2d {

	#textureBg;	
	#textStyle;
	#players;

    constructor({
        textureBg,
		players = [],
        textStyle,
		
        fps = 60,
        order = "",
        positionRelative = {vertical: {x: -0.5, y: 0.5}, horizontal: {x: -0.5, y: 0.5}},
        positionAbsolute = {vertical: {x: 50, y: -100}, horizontal: {x: 50, y: -100}},
        scaleAbsolute = {vertical: {x: 1, y: 1}, horizontal: {x: 1, y: 1}},
        rotationAbsolute = {vertical: 0, horizontal: 0}
   }) {
        super(fps, order, positionRelative, positionAbsolute, scaleAbsolute, rotationAbsolute);

		//-
		
        this.#textureBg = textureBg;
			
		this.#textStyle = Object.assign({
			fontFamily		: "Baloo",
			fontSize		: 32,
			fill			: 0xffffff,
			align			: "left",
			fontWeight 		: "normal",
			valign			: "center",
			letterSpacing	: -1,
			lineHeight		: -0,
			wordWrapWidth	: 150,
			wordWrapHeight	: 60,
			wordWrap		: false
		}, textStyle);
		
		if (this.#textStyle.autoWordWrap && this.#textureBg) {
			this.#textStyle.wordWrapWidth = this.#textureBg.width * 0.85;
			this.#textStyle.wordWrapHeight = this.#textureBg.height * 0.85;
		}
		
		for(let i=0; i<players.length; i++){
			this.addPlayer( players[i] );
		}	
		
		//-
		
		return this;
    }

	addPlayer = ( data ) => {
		data = Object.assign({
			nick:"player", 
			color:0xffffff,
			score:0,
			scoreMax:100
		}, data);
		
		let id = this.animationContainer.children.length;
		
		let player = new IMPION.Group2d();
		player.v_data = data;
		player.v_id = id;
		player.v_score = data.score;
		player.v_scoreMax = data.scoreMax;
		player.y = player.toY = (this.#textureBg.height + 3) * id;
		this.animationContainer.addChild( player );

			player.bgObject = new IMPION.Sprite2d();
			player.bgObject.texture = this.#textureBg;
			player.bgObject.anchor.set(0, 0.5);
			player.bgObject.tint = data.color;
			player.addChild( player.bgObject );

			player.textObject = new IMPION.Text2d(
				(1 + id) + ". " + data.nick,
				this.#textStyle
			)
			player.textObject.x = this.#textureBg.width*0.05;
			player.textObject.y = 0;
			player.addChild( player.textObject );
			
			player.maskObject = new IMPION.Sprite2d();
			player.maskObject.texture = this.#textureBg;
			player.maskObject.anchor.set(0, 0.5);
			player.addChild( player.maskObject );

			player.bgObject.mask = player.maskObject;
			player.textObject.mask = player.maskObject;
			
		this.#updateLeaders();	
	}

    #updateLeaders(){
		for(let i=0; i<this.animationContainer.children.length; i++){
			this.animationContainer.children[i].v_scoreN = this.animationContainer.children[i].v_score / this.animationContainer.children[i].v_scoreMax;
		}
		
		this.animationContainer.children.sort( (a, b) => b.v_scoreN - a.v_scoreN );
		
		for(let i=0; i<this.animationContainer.children.length; i++){
            this.animationContainer.children[i].toY = (this.#textureBg.height + 3) * i;
            this.animationContainer.children[i].textObject.setText((1 + i) + ". " + this.animationContainer.children[i].v_data.nick);
        }
    }

	//------------------------------------------------------------------------

	enterframe = ( timeDelta )=>{
		for(let i=0; i<this.animationContainer.children.length; i++){
            let player =  this.animationContainer.children[i];
			
			player.y = player.toY - 0.8 * (player.toY - player.y);
			player.bgObject.anchor.x = 0.08 * i - 0.8 * (0.08 * i - player.bgObject.anchor.x);
        }
    }

	//resize = (width, height)=>{
	//	if(width < height){
	//		this.x = this.positionAbsolute.vertical.x +  this.positionRelative.vertical.x * width;
	//		this.y = this.positionAbsolute.vertical.y +  this.positionRelative.vertical.y * height;
	//		this.scale.set(this.scaleAbsolute.vertical.x, this.scaleAbsolute.vertical.y);
	//		this.rotation = this.rotationAbsolute.vertical;
	//	}else{
	//		this.x = this.positionAbsolute.horizontal.x +  this.positionRelative.horizontal.x * width;
	//		this.y = this.positionAbsolute.horizontal.y +  this.positionRelative.horizontal.y * height;
	//		this.scale.set(this.scaleAbsolute.horizontal.x, this.scaleAbsolute.horizontal.y);
	//		this.rotation = this.rotationAbsolute.horizontal;
	//	}
    //}

}