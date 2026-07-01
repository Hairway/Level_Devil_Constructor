const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

function createWindow () {
	const mainWindow = new BrowserWindow({
		width	: 850,
		height	: 800,
		webPreferences: {
			preload : path.join(__dirname, '../src/components/creator/api/ElectronAPI.js'),
			enableRemoteModule : false,
			nodeIntegration	: true,
			contextIsolation: true,
		},
	});

	mainWindow.loadURL('http://localhost:8080');
	mainWindow.webContents.openDevTools({ mode: 'right' });

	ipcMain.on('toggle-devtools', () => {
		const isVisible = mainWindow.webContents.isDevToolsOpened();
		
		if(isVisible){
			mainWindow.webContents.closeDevTools();
		}else{
			mainWindow.webContents.openDevTools({ mode: 'right' });
		}
	});
	
	ipcMain.on('relaunch-app', () => {
		app.relaunch();
		app.exit(0);
	});

}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
	if(process.platform !== 'darwin'){
		app.quit();
	}
});

app.on('activate', () => {
	if(BrowserWindow.getAllWindows().length === 0){
		createWindow();
	}
});
