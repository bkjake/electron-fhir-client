const {app, BrowserWindow, globalShortcut} = require('electron')
const path = require('path')
const url = require('url')
const {ipcMain} = require('electron')
const fs = require("fs");
const https = require("https");
const http = require("http");
const putter = require("./put-resource");
const defaultOptions = putter.defaultOptions;

/*--  Globals  --*/

global.putter = putter;

// Global references to windows
let mainWindow, authWindow, settingsWindow

/*--  Initializations  --*/

// Read & apply configurations from conf.json file
function initializeConfigurations() {
  if (!fs.existsSync(path.join(__dirname,"conf.json"))) {
    fs.writeFileSync(path.join(__dirname,"conf.json"), JSON.stringify(defaultOptions, null, 4), "utf-8");
  } else {
    try {
      const conf = JSON.parse(fs.readFileSync(path.join(__dirname,"conf.json"), "utf-8"));
      putter.conf(conf);
    } catch (err) {}
  }
}

// Initialize IPC Events
function bindIPCEvents() {
  ipcMain.on('auth', (event, arg) => {
    createAuthWindow(event);
  })

  ipcMain.on('settings', (event, arg) => {
    createSettingsWindow(event);
  })

  ipcMain.on('close-settings', (event, arg) => {
    settingsWindow && settingsWindow.close();
  })

  ipcMain.on('showResource', (event, arg) => {
    const resource = (typeof arg === "object") ? JSON.stringify(arg, null, 4) : arg;
    createResourceWindow(resource);
  });
}

/*-- Helpers --*/

function generateAuthorizeUrl() {
  return `${putter.authConf().protocol}://${putter.authConf().host}${putter.authConf().authorizePath}` + '?' +
        'response_type=code&' +
        'client_id=' + encodeURIComponent(putter.authConf().clientId) + '&' +
        'scope=' + encodeURIComponent(putter.authConf().scope) + '&' +
        'prompt=login&' +
        'redirect_uri=' + encodeURIComponent(
          putter.authConf().redirectUri
        ) + '&' + 'state=' + Math.round(Math.random() * 100000000).toString();
}

function generateTokenRequestUrl(code) {
  return 'grant_type=authorization_code' +
      '&client_id=' + encodeURI(putter.authConf().clientId) +
      '&redirect_uri=' + encodeURI(putter.authConf().redirectUri) +
      '&code=' + encodeURI(code);
}

function exchangeToken(tokenRequestParams) {
  return new Promise((resolve) => {
    var options = {
      host: putter.authConf().host,
      port: putter.authConf().port || (putter.authConf().protocol === "https" ? 443 : 80),
      path: putter.authConf().tokenPath,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      method: 'POST'
    }

    const req = ((putter.authConf().protocol === "https") ? https : http).request(options, function(res) {
      res.setEncoding('utf8');
      let response = '';
      res.on('data', function (chunk) {
        response += chunk;
      });
      res.on('end', function() {
        try{
          resolve(JSON.parse(response).access_token);
        } catch(parseError){
          resolve(undefined);
        }
      });
    });
    req.on('error', function(e) {
      console.warn('problem with request: ' + e.message);
      resolve(undefined);
    });
    req.write(tokenRequestParams);
    req.end();
  });
}

/*--  Window Creators  --*/

// Display Resource Details
function createResourceWindow(resource) {
  let resourceWindow = new BrowserWindow({
    width: 800,
    height: 600,
    'node-integration': false,
    'web-security': false,
    modal: true,
    parent: mainWindow,
    show: false
  });
  resourceWindow.loadFile("codeView.html");
  resourceWindow.show();
  // resourceWindow.webContents.openDevTools();

  resourceWindow.webContents.on('did-finish-load', () => {
    resourceWindow.webContents.executeJavaScript(`resource = ${resource};document.querySelector("pre").innerHTML = JSON.stringify(resource, null, 4)`);
  });
  // resourceWindow.webContents.openDevTools();
  resourceWindow.on('closed', function() {
    resourceWindow = null;
  });
}

// Settings
function createSettingsWindow(_event) {
  settingsWindow = new BrowserWindow({
    width: 400,
    height: 750,
    show: false,
    'node-integration': false,
    'web-security': false,
    resizable: false,
    modal: true,
    parent: mainWindow,
    show: false
  });
  settingsWindow.loadFile("settings.html");
  settingsWindow.show();
  settingsWindow.on('closed', function() {
    settingsWindow = null;
  });
}

// Authentication Window
function createAuthWindow(_event) {
  authWindow = new BrowserWindow({
    width: 800,
    height: 600,
    show: false,
    'node-integration': false,
    'web-security': false,
    resizable: false,
    modal: true,
    parent: mainWindow,
    show: false
  });

  // open authorization window
  var authUrl = generateAuthorizeUrl();
  authWindow.loadURL(authUrl);
  authWindow.show();

  // handle when redirected with code and exchange it with token
  authWindow.webContents.on('did-navigate', function (event,   newUrl) {
    if (/code=([^&]+)/.test(newUrl)) {
      const code = /code=([^&]+)/.exec(newUrl)[1];
      const tokenRequestParams = generateTokenRequestUrl(code);
      exchangeToken(tokenRequestParams).then(token => {
        _event.sender.send('token', token);
        authWindow.close();
      });
    }
  });

  authWindow.on('closed', function() {
    authWindow = null;
  });
}

// Main Window
function createWindow () {
  mainWindow = new BrowserWindow({width: 800, height: 600})
  mainWindow.loadFile('index.html')
  mainWindow.on('closed', function () {
    mainWindow = null
  })
}

/*-- Main --*/

initializeConfigurations();
bindIPCEvents();

app.on('ready', () => {
  createWindow();
  // Uncomment below to enable inspection with F12 key
  /*
  globalShortcut.register("F12", () => {
    if (mainWindow) mainWindow.webContents.openDevTools();
    if (authWindow) authWindow.webContents.openDevTools();
    if (settingsWindow) settingsWindow.webContents.openDevTools();
  });
  */
})

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow()
  }
})
