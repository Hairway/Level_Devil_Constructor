export default class MathExtension{
	
	#app;

	constructor({app}){
		this.#app = app;
	}
}

if(Math && !Math.extraExtension){
	Math.extraExtension = true;
	
	Math.toRAD = Math.PI/180;
	
	Math.randomInteger = function ( min, max ) {
		let rand = min + Math.random() * (max + 1 - min);
		return Math.floor(rand);
	}

	Math.turnPoint = function ( point, center, angle ) {
		let x = point.x;
		let y = point.y;
		let cx = center.x;
		let cy = center.y;		
		point.x = cx + (x - cx)*Math.cos(angle) - (y - cy)*Math.sin(angle);
		point.y = cy + (x - cx)*Math.sin(angle) - (y - cy)*Math.cos(angle);	
	}

	Math.mixArray = function ( array ) {
		let currentIndex = array.length;
		let temporaryValue;
		let randomIndex;

		while (0 !== currentIndex) {
			randomIndex = Math.floor(Math.random() * currentIndex);
			currentIndex -= 1;

			temporaryValue = array[currentIndex];
			array[currentIndex] = array[randomIndex];
			array[randomIndex] = temporaryValue;
		}

		return array;
	}

	Math.sortY = function ( a, b ) {
		if ( a.y < b.y ){
			return -1;
		}
		if ( a.y > b.y ){
			return 1;
		}
		return 0;
	}
	
	Math.isLookingAt = function(A_position, A_rotationY, B_position, angleDeg) {
		let toRadians = Math.PI / 180;
		let cosLimit = Math.cos((angleDeg * 0.5) * toRadians);

		let forward = {
			x: Math.sin(A_rotationY),
			y: 0,
			z: Math.cos(A_rotationY)
		};

		//-
		
		let dx = B_position.x - A_position.x;
		let dy = B_position.y - A_position.y;
		let dz = B_position.z - A_position.z;

		let len = Math.hypot(dx, dz);
		
		if (len < 1e-6){ return true; }

		let toB = { x: dx / len, y: 0, z: dz / len };
		let dot = forward.x * toB.x + forward.z * toB.z;

		return dot >= cosLimit;
	};
}
