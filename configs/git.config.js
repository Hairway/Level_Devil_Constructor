const { exec } = require('child_process');

const fs = require('fs');
const path = require('path');

//const newOriginUrl = 'https://github.com/StudioCation/Projects.git';
//const upstreamUrl = 'https://github.com/StudioCation/PlayableTemplate.git';

const newOriginUrl = 'git@github.com:StudioCation/Projects.git';
const upstreamUrl = 'git@github.com:StudioCation/PlayableTemplate.git';

const executeCommand = (command) => {
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                reject(`Error: ${stderr}`);
            } else {
                resolve(stdout);
            }
        });
    });
};

const runGitCommands = async () => {
    try {
        // Delete old origin
		
        await executeCommand('git remote remove origin');
        console.log('Removed old origin.');

        // Adding a new origin
		
        await executeCommand(`git remote add origin ${newOriginUrl}`);
        console.log(`Added new origin: ${newOriginUrl}`);

        // Adding upstream
		
        await executeCommand(`git remote add upstream ${upstreamUrl}`);
        console.log(`Added upstream: ${upstreamUrl}`);

        // Checking remote repositories
		
        const remotes = await executeCommand('git remote -v');       
	   console.log('Current remotes:\n', remotes);
   
	}catch(error){
        console.error(error);
    }
};

runGitCommands();
