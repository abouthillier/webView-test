import { electronApp, is, optimizer } from '@electron-toolkit/utils'
import { app, BrowserWindow, shell } from 'electron'
import {
	installExtension,
	REACT_DEVELOPER_TOOLS
} from 'electron-devtools-installer'
import { join } from 'path'

function createWindow(): void {
	// Create the browser window.
	const mainWindow = new BrowserWindow({
		width: 1280,
		height: 720,
		backgroundColor: '#FFFBF0',
		show: false,
		autoHideMenuBar: true,
		webPreferences: {
			sandbox: true,
			webSecurity: true,
			allowRunningInsecureContent: false,
			webviewTag: true,
			preload: join(__dirname, '../preload/index.js')
		}
	})

	mainWindow.on('ready-to-show', () => {
		mainWindow.show()
	})

	mainWindow.webContents.setWindowOpenHandler((details) => {
		shell.openExternal(details.url)
		return { action: 'deny' }
	})

	// HMR for renderer base on electron-vite cli.
	// Load the remote URL for development or the local html file for production.
	if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
		mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
	} else {
		mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
	}
}

async function main(): Promise<void> {
	await app.whenReady()

	await installExtension(REACT_DEVELOPER_TOOLS)

	// Set app user model id for windows
	electronApp.setAppUserModelId('com.electron')

	app.on('browser-window-created', (_, window) => {
		optimizer.watchWindowShortcuts(window)
	})

	createWindow()
}

main()
