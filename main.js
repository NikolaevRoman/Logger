const { app, BrowserWindow, Menu, dialog } = require("electron");
let winWebContents;
function createWindow() {
	const win = new BrowserWindow({
		width: 800,
		height: 600,
		webPreferences: {
			nodeIntegration: true,
		},
		backgroundColor: "#1E1E1E",
	});
	winWebContents = win.webContents;
	win.loadFile("index.html");
	win.setBackgroundColor("#1E1E1E");
	winWebContents.on("before-input-event", (event, input) => {
		if (input.control && input.key.toLowerCase() === "f") {
			winWebContents.send("openFinder");
			event.preventDefault();
		}
	});
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		app.quit();
	}
});

app.on("activate", () => {
	if (BrowserWindow.getAllWindows().length === 0) {
		createWindow();
	}
});
const { ipcMain } = require("electron");
const fs = require("fs");
const prevText = { value: null };
const diffText = { value: null };
let intervalId = -1;
let filePath = "";
const fileReader = () => {
	fs.readFile(filePath, (err, data) => {
		if (err) {
			clearInterval(intervalId);
			console.log(`File doesn't exist`);
			return;
		}
		let val = data.toString();
		if (prevText.value === val) {
			return;
		}
		prevText.value = val;
		if (diffText.value) {
			let newVal = val.replace(diffText.value, "");
			val = newVal;
		}
		console.log(val);
		winWebContents.send("fileValue", val);
	});
};

const startFileReading = () => {
	intervalId = setInterval(() => {
		fileReader();
	}, 500);
};

ipcMain.on("stopReading", () => {
	clearInterval(intervalId);
	winWebContents.send("stopReading");
});

ipcMain.on("startReading", () => {
	startFileReading();
	winWebContents.send("startReading");
});

const isMac = process.platform === "darwin";

const template = [
	// { role: 'appMenu' }
	// { role: 'fileMenu' }
	{
		label: "File",
		submenu: [
			// isMac ? { role: "close" } : { role: "quit" },
			{
				label: "Choose file",
				click: () => {
					dialog
						.showOpenDialog({
							properties: ["openFile"],
						})
						.then((result) => {
							clearInterval(intervalId);
							console.log(result.filePaths);
							diffText.value = null;
							filePath = result.filePaths[0] || "";
							startFileReading();
						})
						.catch((err) => {
							console.log(err);
						});
				},
			},
			{
				label: "Highlight text",
				click: () => {
					winWebContents.send("highlightValue", ``);
				},
			},
			{
				label: "Clear and show only updates",
				click: () => {
					diffText.value = prevText.value;
				},
			},
			{
				label: "Clear diff",
				click: () => {
					diffText.value = null;
				},
			},
		],
	},

	{
		label: "View",
		submenu: [
			{ role: "reload" },
			{ role: "forceReload" },
			{ role: "toggleDevTools" },
			{ type: "separator" },
			{ role: "resetZoom" },
			{ role: "zoomIn" },
			{ role: "zoomOut" },
			{ type: "separator" },
			{ role: "togglefullscreen" },
		],
	},
	// { role: 'windowMenu' }
	{
		label: "Window",
		submenu: [
			{ role: "minimize" },
			{ role: "zoom" },
			...(isMac
				? [
						{ type: "separator" },
						{ role: "front" },
						{ type: "separator" },
						{ role: "window" },
				  ]
				: [{ role: "close" }]),
		],
	},
	{
		role: "help",
		submenu: [
			{
				label: "Learn More",
				click: async () => {
					const { shell } = require("electron");
					await shell.openExternal("https://electronjs.org");
				},
			},
		],
	},
];

const menu = Menu.buildFromTemplate(template);
Menu.setApplicationMenu(menu);
