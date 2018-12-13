// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

// Imports

const {ipcRenderer} = require('electron')
const $ = require("jquery");
const remote = require('electron').remote;
const dialog = remote.dialog;
const fs = require("fs");
const putter = remote.getGlobal("putter");
const path = require("path");

// Globals

const addedFiles = {};
let token;

// Helpers

let toggleAll = false;

function activateUI() {
  $("#no-token").css("display", "none");
  $("#main").css("display", "block");
}

function toggleUseTokenDisabled(event) {
  if ($("#token-input").val()) {
    $("#manual-token").removeAttr("disabled");
  } else {
    $("#manual-token").attr("disabled", "true");
  }
}

function extractFileName(_path) {
	return path.basename(_path);
}

// $("[id|=put-check]")

function pathToId(str) {
  return Object.keys(addedFiles).indexOf(str);// str.replace(/\//g, "_").replace(/\\/g, "_").replace(/\./g, "_").replace(" ", "_");
}

function addFilesToView(paths) {
  $("#files").append(
    paths.map(path => `
      <li id="item-${pathToId(path)}">
        <input type="checkbox" ${addedFiles[path].selected ? 'checked' : ''} id="put-check-${pathToId(path)}">
        <label for="put-check-${pathToId(path)}" title="${path}">${extractFileName(path)}</label>
        ${!!addedFiles[path].resource ? '<button class="c-button" id="item-' + pathToId(path) + '-resource">(' + addedFiles[path].resource.id + ')</button>' : ''}
        <a style="color: red; cursor: pointer" class="delete"><i class="fa fa-trash"></i></a>
      </li>
  `).join(""));

  paths.forEach(path => {
    $(`#put-check-${pathToId(path)}`).on("change", function() {
      addedFiles[path].selected = $(this).prop("checked");
    });
    $(`#item-${pathToId(path)} a.delete`).on("click", function() {
      // console.log(path);
      delete addedFiles[path];
      // console.log(addedFiles);
      refreshFileList();
    });
    if (!!addedFiles[path].resource) {
      $(`#item-${pathToId(path)}-resource`).on("click", () => {
        ipcRenderer.send("showResource", addedFiles[path].resource);
      });
    }
  });

}

function refreshFileList() {
  $("#files").html("");
  addFilesToView(Object.keys(addedFiles));
  Object.keys(addedFiles).forEach(_path => {
    // console.log(_path, addedFiles[_path]);
    if (addedFiles[_path].put) {
      // console.log(`#item-${pathToId(_path)}`, $(`#item-${pathToId(_path)}`));
      $(`#item-${pathToId(_path)}`).css("color", "green");
    } else if (addedFiles[_path].error) {
      $(`#item-${pathToId(_path)}`).css("color", "red");
    }
  });
}

function disableTemporarily(selector, _promise) {
  $(selector).addClass("temp-disabled");
  _promise.then(
    () => $(selector).removeClass("temp-disabled"),
    () => $(selector).removeClass("temp-disabled")
  );
}

// Functions

function readConfigurations() {
  $("#select-files").attr("disabled", "true");
  fs.readFile(path.join(__dirname, "conf.json"), "utf-8", (err, data) => {
    if (!err) {
      try {
        putter.conf(JSON.parse(data));
        $("#configuration-error").css("display", "none");
      } catch (_parseErr) {
        $("#configuration-error").css("display", "block");
      }
    } else {
      $("#configuration-error").css("display", "block");
    }
    $("#select-files").removeAttr("disabled");
  });
}

function bindIPCEvents() {
  ipcRenderer.on('consoleLog', (event, arg) => {
    console.log(arg)
  })

  ipcRenderer.on('token', (event, arg) => {
      ipcRenderer.send("close-auth")
      if (arg) {
          token = arg;
          putter.setToken(token);
          $("#token-input").val(token);
          toggleUseTokenDisabled();
          activateUI();
      } else {
          ipcRenderer.send('auth', '')
      }
  })

}

function bindDOMEvents() {
  $("#token-input").on("change", toggleUseTokenDisabled);
  $("#token-input").on("keyup", toggleUseTokenDisabled);

  $("#no-auth").on("click", (event) => {
    token = undefined;
    putter.setToken(token);
    activateUI();
  })

  $("#onauth-token").on("click", (event) => {
    ipcRenderer.send("auth", "");
  })

  $("#manual-token").on("click", (event) => {
    token = $("token-input").val();
    putter.setToken(token);
    activateUI();
  })

  $("#new-token").on("click", (event) => {
    $("#no-token").css("display", "block")
  })

  $("#select-files").on("click", (event) => {
    dialog.showOpenDialog({ properties: [ 'openFile', 'multiSelections'], filters: [{ extensions: ['json'] }]}, (filePaths) => {
      if (filePaths) {
        filePaths.forEach(_path => {
          addedFiles[_path] = {
            selected: true,
            error: false,
            put: false
          };
        });
        addFilesToView(filePaths);
      }
    });
  })

  $("#toggle-all-none").on("click", () => {
    toggleAll = !toggleAll;
    Object.keys(addedFiles).forEach(path => $(`#put-check-${pathToId(path)}`).prop("checked", toggleAll));
  });

  $("#delete-selected").on("click", () => {
    Object.keys(addedFiles).forEach(path => {
      if ($(`#put-check-${pathToId(path)}`).prop("checked")) {
        delete addedFiles[path];
      }
    });
    refreshFileList();
  });

  $("#send-selected").on("click", () => {
    const _promise = putter.put(Object.keys(addedFiles).filter(path => addedFiles[path].selected));
    disableTemporarily("button", _promise);
    _promise.then(results => {
      Object.keys(results).forEach(path => {
        addedFiles[path].put = !!results[path];
        addedFiles[path].error = !results[path];
        addedFiles[path].selected = false;
        if (!!results[path]) {
          addedFiles[path].resource = results[path];
        }
      });
      refreshFileList();
    });
  });

  $(".settings").on("click", () => {
    ipcRenderer.send("settings");
  });

}
// Main

readConfigurations();
bindIPCEvents();
bindDOMEvents();
