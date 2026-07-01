import fs from 'fs-extra';
import inquirer from 'inquirer';
import path from 'path';

let templateName = "viewer";

//- 

//inquirer
//	.prompt([
//		{
//			type: 'confirm',
//			name: 'proceed',
//			message: 'Are you sure you want to run this command?',
//		},
//	])
//	.then(answers => {
//		if (answers.proceed) {
//			clearRestore();
//		}else {
//			console.log('Command canceled');
//		}
//});

clearRestore();

function clearRestore(){
	fs.remove('./src/utils/templates/restore/')
	.then(() => {
		addRestore();
	})
	.catch(err => {
		console.log("Error clear restore");
	});
}

function addRestore(){
	fs.mkdir('./src/utils/templates/restore/assets/', { recursive: true })
	.then(() => {
		fs.readdir("./src", (err, files) => {
			files.forEach(file => {
				if (path.extname(file) === '.mjs') {
					const srcPath = path.join('./src/', file);
					const destPath = path.join('./src/utils/templates/restore/', file);
					fs.copyFile(srcPath, destPath, (err) => {
						
					});
				}
			});
				
			fs.access(path.join('./src/assets/', 'Assets.zip'), fs.constants.F_OK, (err) => {		
				if(!err){
					const srcPath = path.join('./src/assets/', 'Assets.zip');
					const destPath = path.join('./src/utils/templates/restore/assets/', 'Assets.zip');
					fs.copyFile(srcPath, destPath, (err) => {});
				}
			});
			
			deleteAssets();
		});
	})
	.catch((err) => {
		console.error('Error create restore/assets');
	})
}

function deleteAssets(){
	fs.remove('./src/assets')
	.then(() => {
		createAssets();
	})
	.catch(err => {
		console.log("Error delete assets");
	});

}

function createAssets(){
	fs.copy('./src/utils/templates/'+templateName+'/assets', './src/assets')
	.then(() => {
		const filePath = path.join('./src/assets/', 'Assets.mjs');
		const fileContent = 'let DataAssets = { zip: "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" }; export default DataAssets;';
		
		fs.writeFile(filePath, fileContent, 'utf8', (err) => {
			if (err) {
				console.log("Error create Assets.mjs");
			} else {
				createCode();
			}
		});
	})
	.catch(err => {
		console.log("Error create assets");
	});
}

function createCode(){
	fs.readdir("./src", (err, files) => {
		files.forEach(file => {
			if (path.extname(file) === '.mjs') {
				fs.unlink(path.join("./src", file), (err) => {
					
				});
			}
		});
		
		fs.readdir('./src/utils/templates/'+templateName, (err, files) => {
			files.forEach(file => {
				if (path.extname(file) === '.mjs') {
					const srcPath = path.join('./src/utils/templates/'+templateName, file);
					const destPath = path.join('./src', file);
					fs.copyFile(srcPath, destPath, (err) => {
						
					});
				}
			});
			
			console.log("Complete create template!");
		});
	});
}
