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

// Helpers

function formIsValid() {
  $("*").removeClass("invalid");
  if (!$("#host").val()) {
    $("#host").addClass("invalid");
    return false;
  }
  if (!$("#path").val()) {
    $("#path").addClass("invalid");
    return false;
  }
  if (!$("#port").val() || isNaN(parseInt($("#port").val(), 10))) {
    $("#port").addClass("invalid");
    return false;
  }
  if (!$("#protocol-https").prop("checked") && !$("#protocol-http").prop("checked")) {
    $("[id|=protocol]").addClass("invalid");
    return false;
  }
  if (!$("#auth-host").val()) {
    $("#auth-host").addClass("invalid");
    return false;
  }
  if (!$("#auth-port").val() || isNaN(parseInt($("#port").val(), 10))) {
    $("#auth-port").addClass("invalid");
    return false;
  }
  if (!$("#auth-protocol-https").prop("checked") && !$("#auth-protocol-http").prop("checked")) {
    $("[id|=auth-protocol]").addClass("invalid");
    return false;
  }
  if (!$("#auth-authorize-path").val()) {
    $("#auth-authorize-path").addClass("invalid");
    return false;
  }
  if (!$("#auth-token-path").val()) {
    $("#auth-token-path").addClass("invalid");
    return false;
  }
  if (!$("#auth-redirect-uri").val()) {
    $("#auth-redirect-uri").addClass("invalid");
    return false;
  }
  if (!$("#auth-client-id").val()) {
    $("#auth-client-id").addClass("invalid");
    return false;
  }
  if (!$("#auth-scope").val()) {
    $("#auth-scope").addClass("invalid");
    return false;
  }
  return true;
}

// Functions

function initConfigurations() {
  const conf = putter.conf();
  $("#host").val(conf.host);
  $("#path").val(conf.path);
  $("#port").val(conf.port);
  if (conf.protocol && (["http", "https"].indexOf(conf.protocol) !== -1)) {
    $("#protocol-" + conf.protocol).prop("checked", true);
  } else {
    $("#protocol-http").prop("checked", true);
  }
  const authConf = putter.authConf();
  $("#auth-host").val(authConf.host);
  $("#auth-authorize-path").val(authConf.authorizePath);
  $("#auth-token-path").val(authConf.tokenPath);
  $("#auth-port").val(authConf.port);
  $("#auth-redirect-uri").val(authConf.redirectUri);
  $("#auth-client-id").val(authConf.clientId);
  $("#auth-scope").val(authConf.scope);
  if (authConf.protocol && (["http", "https"].indexOf(authConf.protocol) !== -1)) {
    $("#auth-protocol-" + authConf.protocol).prop("checked", true);
    $("#auth-port").attr("placeholder", 443);
  } else {
    $("#auth-protocol-http").prop("checked", true);
    $("#auth-port").attr("placeholder", 80);
  }
}

function bindDOMEvents() {
  $("#cancel").on("click", () => {
    ipcRenderer.send("close-settings");
  });

  $("#protocol-https").on("change", function() {
    if ($(this).prop("checked") && ((!$("#port").val()) || $("#protocol-http").attr("autoselected"))) {
      $("#protocol-http").removeAttr("autoselected");
      $(this).attr("autoselected", true);
      $("#port").val(443);
    }
  });

  $("#protocol-http").on("change", function() {
    if ($(this).prop("checked") && ((!$("#port").val()) || $("#protocol-https").attr("autoselected"))) {
      $("#protocol-https").removeAttr("autoselected");
      $(this).attr("autoselected", true);
      $("#port").val(80);
    }
  });

  $("#port").on("change", () => {
    $("#protocol-https").removeAttr("autoselected");
    $("#protocol-http").removeAttr("autoselected");
  });

  $("#save").on("click", () => {
    const conf = {};
    if (formIsValid()) {
      conf.host = $("#host").val();
      conf.path = $("#path").val();
      conf.port = parseInt($("#port").val(), 10);
      conf.protocol = $("#protocol-https").prop("checked") ? "https" : "http";
      conf.authOptions = {};
      conf.authOptions.host = $("#auth-host").val();
      conf.authOptions.authorizePath = $("#auth-authorize-path").val();
      conf.authOptions.tokenPath = $("#auth-token-path").val();
      conf.authOptions.port = parseInt($("#auth-port").val(), 10);
      conf.authOptions.protocol = $("#auth-protocol-https").prop("checked") ? "https" : "http";
      conf.authOptions.redirectUri = $("#auth-redirect-uri").val();
      conf.authOptions.clientId = $("#auth-client-id").val();
      conf.authOptions.scope = $("#auth-scope").val();

      putter.conf(conf);
      $("#file-write-error").css("display", "none");
      try {
        fs.writeFileSync(path.join(__dirname, "conf.json"), JSON.stringify(conf, null, 2), "utf-8");
        ipcRenderer.send("close-settings");
      } catch (err) {
        $("#file-write-error").css("display", "block");
        $("#file-write-error-details").html(JSON.stringify(err));
      }
    }
  });
}
// Main

initConfigurations();
bindDOMEvents();
