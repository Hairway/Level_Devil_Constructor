import fs from 'fs-extra';
import inquirer from 'inquirer';
import path from 'path';
import {execSync} from 'child_process';

export async function installTemplate( templateName ) {
    try{
        await clearRestore();
        await addRestore();
		await deleteAssets();
        await createAssets( templateName );
		await createCode( templateName );
		
		console.log("Complete create template!");
    }catch(error){
        console.error("Error occurred during the process:", error);
    }
}

async function clearRestore() {
    try{
        await fs.remove('./src/utils/templates/restore/');
    }catch(error){
        throw new Error("Error clearing restore: " + error.message);
    }
}

async function addRestore() {
    try{
        await fs.mkdir('./src/utils/templates/restore/assets/', { recursive: true });
        
		//- Save code
		
        const files = await fs.readdir('./src');
		
        for(const file of files){
            if (path.extname(file) === '.mjs') {
                const srcPath = path.join('./src/', file);
                const destPath = path.join('./src/utils/templates/restore/', file);
                await fs.copyFile(srcPath, destPath);
            }
        }

		//- Save assets
		
        const assetsPath = path.join('./src/assets/', 'Assets.zip');
        const restoreAssetsPath = path.join('./src/utils/templates/restore/assets/', 'Assets.zip');
        
        try{
            await fs.access(assetsPath, fs.constants.F_OK);
            await fs.copyFile(assetsPath, restoreAssetsPath);
        }catch{}
        
	}catch(error){
        throw new Error("Error adding restore: " + error.message);
    }
}

async function deleteAssets() {
    try{
        await fs.remove('./src/assets');
    }catch(error){
        throw new Error("Error deleting assets: " + error.message);
    }
}

async function createAssets(templateName) {
    try{
        await fs.copy('./src/utils/templates/'+templateName+'/assets', './src/assets');
    }catch(error){
        throw new Error("Error creating assets: " + error.message);
    }
}

async function createCode(templateName) {
    try{
        const files = await fs.readdir('./src');
        for (const file of files) {
            if (path.extname(file) === '.mjs') {
                await fs.unlink(path.join('./src', file));
            }
        }

        const templateFiles = await fs.readdir('./src/utils/templates/'+templateName);
        for (const file of templateFiles) {
            if (path.extname(file) === '.mjs') {
                const srcPath = path.join('./src/utils/templates/'+templateName, file);
                const destPath = path.join('./src', file);
                await fs.copyFile(srcPath, destPath);
            }
        }
		
    }catch(error){
        throw new Error("Error creating code: " + error.message);
    }
}