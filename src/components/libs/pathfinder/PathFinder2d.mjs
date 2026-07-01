import * as IMPION from "#impion";

import PF from "pathfinding";

export default class PathFinder2d extends IMPION.ComponentEmpty{

	#debug;
	#method;
	
	#canvas;
	#world;
	#place;
	
	#matrixGrids = [];
	#matrix;
	#worldX;
	#worldY;
	#worldWX;
	#worldWY;
	#worldCell;
	#allowDiagonal;
	
	//------------------------------------------------------------------------
	
	constructor({
		debug = false,
		method = "AS",
		
		canvas = null,
		world = null,
		place = null,
		
		allowDiagonal = true,
		
		matrix = [],
		worldX = -1000,
		worldY = -1000,
		worldWX = 2000,
		worldWY = 2000,
		worldCell = 50,
	}){
		super();
		
		this.#debug = debug;
		this.#method = method;
		this.#matrix = matrix;
		
		this.#canvas = canvas;
		this.#world = world;
		this.#place = place;
		
		this.#worldX = worldX;
		this.#worldY = worldY;
		this.#worldWX = worldWX;
		this.#worldWY = worldWY;
		this.#worldCell = worldCell;
		
		//-		
		
		if(this.#world){
			this.#place = this.#world.physicalWalls;
		}
		
		//-		
		
		if(this.#method == "AS"){
			
			this.pathfindingAS = new PF.AStarFinder({allowDiagonal: allowDiagonal});
			
			if(this.#matrix.length == 0 && this.#place){
				
				this.#matrix = [];
				
				for(let py = this.#worldY; py < this.#worldY + this.#worldWY; py += this.#worldCell){
					let posCellY = this.#matrix.length;

					this.#matrix.push([]);
					
					for(let px = this.#worldX; px < this.#worldX + this.#worldWX; px += this.#worldCell){
						let posCellX = Math.floor((px - this.#worldX)/this.#worldCell);
						
						let testHit = false;
						
						for(let i=0; i<this.#place.length; i++){
							if(this.#place[i].shape == "circle"){
								let d = Math.hypot(
									(this.#place[i].x - px),
									(this.#place[i].y - py),
								);
								
								if(d < this.#place[i].wx*0.5){
									testHit = true;
									break;
								}
							}else if(this.#place[i].shape == "box"){								
								
								let translatedX = px - this.#place[i].x;
								let translatedY = py - this.#place[i].y;

								let cos = Math.cos(-this.#place[i].rotation);
								let sin = Math.sin(-this.#place[i].rotation);
								
								let rotatedX = translatedX * cos - translatedY * sin;
								let rotatedY = translatedX * sin + translatedY * cos;

								let halfWidth = this.#place[i].wx * 0.5;
								let halfHeight = this.#place[i].wy * 0.5;
								
								if(
									rotatedX >= -halfWidth && 
									rotatedX <= halfWidth && 
									rotatedY >= -halfHeight && 
									rotatedY <= halfHeight
								){									
									testHit = true;
									break;
								}
								
							}
						}
						
						if(testHit){			
							if(this.#debug){
								//this["pathFinderDebug"].beginFill(0xff0000);					
								//this["pathFinderDebug"].drawCircle(px, py, 3);					
								//this["pathFinderDebug"].endFill();					
							}	
							
							this.#matrix[ posCellY ].push( 1 );
							
						}else{
							if(this.#debug){
								//this["pathFinderDebug"].beginFill(0x00ff00);					
								//this["pathFinderDebug"].drawCircle(px, py, 3);					
								//this["pathFinderDebug"].endFill();			
							}
							
							this.#matrix[ posCellY ].push( 0 );
							
						}
					}	
				}
				
				this.#matrixGrids[0] = new PF.Grid( this.#matrix );
			
			}	
		}
		
		//-		
		
		if(this.#debug){
			this.showDebugger( null );	
		}
							
		//-		
		
		return this;
    }

	//------------------------------------------------------------------------
	
	showDebugger( app ){
		this.#debug = true;
		
		this["pathFinderDebug"] = new IMPION.Graphics2d();
		if(this.#world){
			this.#world.debugContainer.addChild( this["pathFinderDebug"] );
		}
		
		//-
		
		if(this.#method == "AS"){
			
			if(this.#place){
				
				for(let py = this.#worldY; py < this.#worldY + this.#worldWY; py += this.#worldCell){
					let posCellY = Math.floor((py - this.#worldY)/this.#worldCell);

					for(let px = this.#worldX; px < this.#worldX + this.#worldWX; px += this.#worldCell){
						let posCellX = Math.floor((px - this.#worldX)/this.#worldCell);
						
						let testHit = false;
						
						for(let i=0; i<this.#place.length; i++){
							if(this.#place[i].shape == "circle"){
								let d = Math.hypot(
									(this.#place[i].x - px),
									(this.#place[i].y - py),
								);
								
								if(d < this.#place[i].wx*0.5){
									testHit = true;
									break;
								}
							}else if(this.#place[i].shape == "box"){								
								
								let translatedX = px - this.#place[i].x;
								let translatedY = py - this.#place[i].y;

								let cos = Math.cos(-this.#place[i].rotation);
								let sin = Math.sin(-this.#place[i].rotation);
								
								let rotatedX = translatedX * cos - translatedY * sin;
								let rotatedY = translatedX * sin + translatedY * cos;

								let halfWidth = this.#place[i].wx * 0.5;
								let halfHeight = this.#place[i].wy * 0.5;
								
								if(
									rotatedX >= -halfWidth && 
									rotatedX <= halfWidth && 
									rotatedY >= -halfHeight && 
									rotatedY <= halfHeight
								){									
									testHit = true;
									break;
								}
								
							}
						}
							
						if(testHit){			
							this["pathFinderDebug"].beginFill(0xff0000);					
							this["pathFinderDebug"].drawCircle(px, py, 3);					
							this["pathFinderDebug"].endFill();		
						}else{
							this["pathFinderDebug"].beginFill(0x00ff00);					
							this["pathFinderDebug"].drawCircle(px, py, 3);					
							this["pathFinderDebug"].endFill();							
						}
					}	
				}
							
			}		
		}
	}
	
	//------------------------------------------------------------------------
	
	findPath = ( positionFrom, positionTo, zone = 0 ) => {
		if(this.#method == "AS"){
			
			let start = {
				x: Math.floor((positionFrom.x - this.#worldX)/this.#worldCell),
				y: Math.floor((positionFrom.y - this.#worldY)/this.#worldCell)
			};
			
			let end = {
				x: Math.floor((positionTo.x - this.#worldX)/this.#worldCell),
				y: Math.floor((positionTo.y - this.#worldY)/this.#worldCell)
			};
			
			if(start.x < 0){ start.x = 0; }
			if(start.x > this.#matrixGrids[zone].width-1){ start.x = this.#matrixGrids[zone].width-1; }
			if(start.y < 0){ start.y = 0; }
			if(start.y > this.#matrixGrids[zone].height-1){ start.y = this.#matrixGrids[zone].height-1; }
			
			if(end.x < 0){ end.x = 0; }
			if(end.x > this.#matrixGrids[zone].width-1){ end.x = this.#matrixGrids[zone].width-1; }
			if(end.y < 0){ end.y = 0; }
			if(end.y > this.#matrixGrids[zone].height-1){ end.y = this.#matrixGrids[zone].height-1; }
			
			if(this.#matrix[ start.y ][ start.x ] == 1){
				let n = 0;
				while(this.#matrix[ start.y ][ start.x ] == 1){
					start.x--;
					
					if(start.x < 0){ start.x = 0; }
					if(start.x > this.#matrixGrids[zone].width-1){ start.x = this.#matrixGrids[zone].width-1; }
					if(start.y < 0){ start.y = 0; }
					if(start.y > this.#matrixGrids[zone].height-1){ start.y = this.#matrixGrids[zone].height-1; }
					
					n++;
					if(n > 30){ break; }
				}
			}
			
			if(this.#matrix[ end.y ][ end.x ] == 1){
				let n = 0;
				while(this.#matrix[ end.y ][ end.x ] == 1){
					end.x--;
					
					if(end.x < 0){ end.x = 0; }
					if(end.x > this.#matrixGrids[zone].width-1){ end.x = this.#matrixGrids[zone].width-1; }
					if(end.y < 0){ end.y = 0; }
					if(end.y > this.#matrixGrids[zone].height-1){ end.y = this.#matrixGrids[zone].height-1; }
					
					n++;
					if(n > 30){ break; }
				}
			}
			
			var path = this.pathfindingAS.findPath(
				start.x,
				start.y,
				end.x,
				end.y,
				this.#matrixGrids[ zone ].clone()
			);
			
			for(let i=0; i<path.length; i++){
				let point = {
					x : this.#worldX + this.#worldCell * path[i][0],
					y : this.#worldY + this.#worldCell * path[i][1],
				};
				
				path[i] = point;
			}
			
			if(this.#debug && path.length > 1){
				this["pathFinderDebug"].lineStyle(4, 0x0000ff, 0.5);					
				this["pathFinderDebug"].moveTo(path[0].x, path[0].y);					
				for(let i=1; i<path.length; i++){
					this["pathFinderDebug"].lineTo(path[i].x, path[i].y);		
				}		
			}
			
			
			return path;
		}
	}
	
	//------------------------------------------------------------------------
	
    //enterframe = ( timeDelta )=>{		
	//	
    //}
    
	//resize = (width, height)=>{
	//	
    //}

}