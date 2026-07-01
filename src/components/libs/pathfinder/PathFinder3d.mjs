import * as IMPION from "#impion";
import {Pathfinding} from "three-pathfinding";
import PF from "pathfinding";

export default class PathFinder extends IMPION.ComponentEmpty{

	#debug;
	#method;
	#navigations;
	#matrixGrids = [];
	#matrix;
	#worldX;
	#worldZ;
	#worldWX;
	#worldWZ;
	#worldCell;

	//------------------------------------------------------------------------
	
	constructor({
		debug = false,
		method = "NM",
		allowDiagonal = true,
		navigations = [],
		matrix = [],
		worldX = -10,
		worldZ = -10,
		worldWX = 20,
		worldWZ = 20,
		worldCell = 0.5,
	}){
		super();
		
		this.#debug = debug;
		this.#method = method;
		this.#matrix = matrix;
		this.#navigations = navigations;
		this.#worldX = worldX;
		this.#worldZ = worldZ;
		this.#worldWX = worldWX;
		this.#worldWZ = worldWZ;
		this.#worldCell = worldCell;

		//-		
		
		if(this.#method == "NM"){
			
			this.pathfindingNM = new Pathfinding();
			
			for(let i = 0; i<this.#navigations.length; i++){
				this.pathfindingNM.setZoneData(i, Pathfinding.createZone( this.#navigations[i].geometry ));
			}
		
		}else if(this.#method == "AS"){
			
			this.pathfindingAS = new PF.AStarFinder({allowDiagonal: allowDiagonal});
			
			this.debugPoint0 			= new IMPION.Group3d();
			this.debugPoint1 			= new IMPION.Group3d();
			this.debugDirection 		= new IMPION.Vector3();
			this.debugRaycaster 		= new IMPION.Raycaster3d();
			
			if(this.#matrix.length == 0 && this.#navigations){
				for(let i=0; i<this.#navigations.length; i++){
					this.#matrix[i] = [];
					
					for(let px = this.#worldX; px < this.#worldX + this.#worldWX; px += this.#worldCell){
						let posCellX = this.#matrix[i].length;

						this.#matrix[i].push([]);
						
						for(let pz = this.#worldZ; pz < this.#worldZ + this.#worldWZ; pz += this.#worldCell){
							let posCellZ = Math.floor((pz - this.#worldZ)/this.#worldCell);

							this.debugPoint0.position.set(px, 0, pz);
							this.debugPoint1.position.set(px, 0, pz);
							this.debugPoint0.position.y += 10;
							this.debugPoint1.position.y -= 10;
							
							this.debugRaycaster.set(
								this.debugPoint0.position,
								this.debugDirection.subVectors(this.debugPoint1.position, this.debugPoint0.position).normalize()
							);
							
							let intersects = this.debugRaycaster.intersectObject(this.#navigations[0], false);
							
							if(intersects.length > 0){			
								if(this.#debug){
									let boxDebug = new IMPION.Mesh3d( this.geometryDebug, this.materialDebug_1 );
									boxDebug.position.set(px, intersects[0].point.y, pz);							
									globalThis.playable.view3d.scene.add( boxDebug );
								}	
								
								this.#matrix[i][ posCellX ][ posCellZ ] = 0;
								
							}else{
								if(this.#debug){
									let boxDebug = new IMPION.Mesh3d( this.geometryDebug, this.materialDebug_0 );
									boxDebug.position.set(px, 0, pz);							
									globalThis.playable.view3d.scene.add( boxDebug );
								}
								
								this.#matrix[i][ posCellX ][ posCellZ ] = 1;
								
							}
						}	
					}

					this.#matrixGrids[i] = new PF.Grid( this.#matrix[i] );

				}
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
		
		this.geometryDebug_0 = new IMPION.BoxGeometry3d( 0.05, 1, 0.05 ); 
		this.geometryDebug_1 = new IMPION.BoxGeometry3d( 0.05, 8, 0.05 ); 
		this.materialDebug_0 = new IMPION.MeshBasicMaterial3d( {color: 0xff0000} ); 
		this.materialDebug_1 = new IMPION.MeshBasicMaterial3d( {color: 0x00ff00} ); 
		this.materialDebug_2 = new IMPION.MeshBasicMaterial3d( {color: 0x0000ff} ); 
		
		if(this.#method == "AS"){
			
			this.debugPoint0 			= new IMPION.Group3d();
			this.debugPoint1 			= new IMPION.Group3d();
			this.debugDirection 		= new IMPION.Vector3();
			this.debugRaycaster 		= new IMPION.Raycaster3d();
			
			if(this.#navigations){
				for(let i=0; i<this.#navigations.length; i++){

					for(let px = this.#worldX; px < this.#worldX + this.#worldWX; px += this.#worldCell){
						let posCellX = Math.floor((px - this.#worldX)/this.#worldCell);

						for(let pz = this.#worldZ; pz < this.#worldZ + this.#worldWZ; pz += this.#worldCell){
							let posCellZ = Math.floor((pz - this.#worldZ)/this.#worldCell);

							this.debugPoint0.position.set(px, 0, pz);
							this.debugPoint1.position.set(px, 0, pz);
							this.debugPoint0.position.y += 10;
							this.debugPoint1.position.y -= 10;
							
							this.debugRaycaster.set(
								this.debugPoint0.position,
								this.debugDirection.subVectors(this.debugPoint1.position, this.debugPoint0.position).normalize()
							);
							
							let intersects = this.debugRaycaster.intersectObject(this.#navigations[0], false);
							
							if(intersects.length > 0){			
							
								let boxDebug = new IMPION.Mesh3d( this.geometryDebug_0, this.materialDebug_1 );
								boxDebug.position.set(px, intersects[0].point.y, pz);		
								boxDebug.name = "helper";
								globalThis.playable.view3d.scene.add( boxDebug );
							
							}else{
							
								let boxDebug = new IMPION.Mesh3d( this.geometryDebug_0, this.materialDebug_0 );
								boxDebug.position.set(px, 0, pz);	
								boxDebug.name = "helper";
								globalThis.playable.view3d.scene.add( boxDebug );
							
							}
						}	
					}
					
				}
			}
			
		
		}
	}
	
	//------------------------------------------------------------------------
	
	findPath = ( positionFrom, positionTo, zone = 0 ) => {
		if(this.#method == "NM"){
			
			let groupCurrent = this.pathfindingNM.getGroup(zone, positionFrom);
			return this.pathfindingNM.findPath(positionFrom, positionTo, zone, groupCurrent);	
		
		}else if(this.#method == "AS"){
			
			let start = {
				x: Math.floor((positionFrom.x - this.#worldX)/this.#worldCell),
				y: Math.floor((positionFrom.z - this.#worldZ)/this.#worldCell)
			};
			
			let end = {
				x: Math.floor((positionTo.x - this.#worldX)/this.#worldCell),
				y: Math.floor((positionTo.z - this.#worldZ)/this.#worldCell)
			};
			
			if(start.x < 0){ start.x = 0; }
			if(start.x > this.#matrixGrids[zone].height-1){ start.x = this.#matrixGrids[zone].height-1; }
			if(start.y < 0){ start.y = 0; }
			if(start.y > this.#matrixGrids[zone].width-1){ start.y = this.#matrixGrids[zone].width-1; }
			
			if(end.x < 0){ end.x = 0; }
			if(end.x > this.#matrixGrids[zone].height-1){ end.x = this.#matrixGrids[zone].height-1; }
			if(end.y < 0){ end.y = 0; }
			if(end.y > this.#matrixGrids[zone].width-1){ end.y = this.#matrixGrids[zone].width-1; }
						
			var path = this.pathfindingAS.findPath(
				start.y,
				start.x,
				end.y,
				end.x,
				this.#matrixGrids[ zone ].clone()
			);
			
			for(let i=0; i<path.length; i++){
				let point = {
					x : this.#worldX + this.#worldCell * path[i][1],
					y : positionFrom.y,
					z : this.#worldZ + this.#worldCell * path[i][0], 
				};
				
				if(this.#debug){
					let boxDebug = new IMPION.Mesh3d( this.geometryDebug_1, this.materialDebug_2 );
					boxDebug.position.set(point.x, point.y, point.z);	
					boxDebug.name = "helper";
					globalThis.playable.view3d.scene.add( boxDebug );
				}
				
				path[i] = point;
			}
			
			return path;
		}
	}
	
	//------------------------------------------------------------------------
	
	#findPathAStar = ( start, end, zone = 0 ) => {
        this.openSetAStar = [];
        this.closedSetAStar = [];
        this.pathAStar = [];
        this.gridAStar = this.#matrix[ zone ];
		
		this.openSetAStar.push( 
			this.#NodeAStar(
				start.x,
				start.y,
				null,
				0,
				this.#heuristicAStar(start, end)
			)
		);
        
        while (this.openSetAStar.length > 0) {
            let currentIndex = 0;
            
			for (let i = 0; i < this.openSetAStar.length; i++) {
                if (this.openSetAStar[i].f < this.openSetAStar[currentIndex].f) {
                    currentIndex = i;
                }
            }
            
			let currentNode = this.openSetAStar[currentIndex];
            
			if (currentNode.x === end.x && currentNode.y === end.y) {
                let temp = currentNode;
               
				while (temp.previous) {
                    this.pathAStar.push([temp.x, temp.y]);
                    temp = temp.previous;
                }
				
                return this.pathAStar.reverse();
            }
            
            this.openSetAStar.splice(currentIndex, 1);
            this.closedSetAStar.push(currentNode);
		
            let neighbors = this.#getNeighborsAStar(currentNode);
           
			for (let neighbor of neighbors) {
                if (this.closedSetAStar.some(node => node.x === neighbor.x && node.y === neighbor.y) || this.gridAStar[neighbor.y][neighbor.x] === 1) {
                    continue;
                }
				
                let tentativeG = currentNode.g + 1;
		
                if (!this.openSetAStar.some(node => node.x === neighbor.x && node.y === neighbor.y)) {
                    this.openSetAStar.push(
						this.#NodeAStar(neighbor.x, neighbor.y, currentNode, tentativeG, this.#heuristicAStar(neighbor, end))
					);
                } else if (tentativeG < neighbor.g) {
                    neighbor.g = tentativeG;
                    neighbor.f = neighbor.g + neighbor.h;
                    neighbor.previous = currentNode;
                }
            }
        }
	
        return [];    
	}
	
	#NodeAStar(x, y, previous, g, h){
		return {
			x : x,
			y : y,
			previous : previous,
			g : g,
			h : h,
			f : g + h,
		};
	}
	
    #getNeighborsAStar( node ) {
        let neighbors = [];
        let dirs = [[1, 0], [0, 1], [-1, 0], [0, -1]];
        for (let dir of dirs) {
            let newX = node.x + dir[0];
            let newY = node.y + dir[1];
            if (newX >= 0 && newX < this.gridAStar[0].length && newY >= 0 && newY < this.gridAStar.length) {
                neighbors.push({ x: newX, y: newY });
            }
        }
        return neighbors;
    }

    #heuristicAStar(a, b) {
        return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    }
	
	//------------------------------------------------------------------------
	
    //enterframe = ( timeDelta )=>{		
	//	
    //}
    
	//resize = (width, height)=>{
	//	
    //}

}