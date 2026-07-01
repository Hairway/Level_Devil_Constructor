import { exec, execSync } from 'child_process';
import chokidar from 'chokidar';

//------------------------------------------

//exec('node ./src/utils/assets/AssetPacker.mjs', (error, stdout, stderr) => {
//	if(error){	
//		console.log(error);
//		return;
//	}			
//	if(stdout){
//		console.log(stdout);						
//		return;
//	}
//	if(stderr){
//		console.log(stderr);						
//		return;
//	}			 
//});

try{
	execSync('node ./src/utils/assets/AssetPacker.mjs', { stdio: 'inherit' });
}catch(error){}

//------------------------------------------

let isUpdate = false;
let isPacking = false;

const watcher = chokidar.watch(
	[
		"./src/assets/fonts",
		"./src/assets/models",
		"./src/assets/sounds",
		"./src/assets/textures",
		"./src/assets/scripts",
		"./src/assets/videos"
	],
	{
		ignored: /(^|[\/\\])\../,
		persistent: true,
		ignoreInitial: true,
	}
);

watcher.on('add', (path) => {
	isUpdate = true;
});

watcher.on('unlink', (path) => {
	isUpdate = true;
});

watcher.on('change', (path) => {
	isUpdate = true;
});

//------------------------------------------

const intervalWard = setInterval(function(){
	if(isUpdate && !isPacking){
		isUpdate = false;
		isPacking = true;
		
		//-
		
		try{
			execSync('node ./src/utils/assets/AssetPacker.mjs', { stdio: 'inherit' });
		}catch(error){
			console.log("intervalWard :"+error);
		}
		
		isPacking = false;

	}
}, 1000);

