const http = require('http');
const https = require('https');
const fs = require('fs');
const defaultOptions = {
  "host": "localhost",
  "path": "/fhir/",
  "port": 8080,
  "protocol": "http",
  "authOptions": {
    "host": "localhost",
    "authorizePath": "/onauth/api/authorize",
    "tokenPath": "/onauth/api/token",
    "port": 80,
    "protocol": "http",
    "redirect_uri": "https://localhost/redirect_uri",
    "clientId": "client-id",
    "scope": "profile openid offline_access user_claims other-custom-scopes"
  }
} // not needed // TODO: remove

let options = Object.assign({}, defaultOptions);

// Send resources in the given files to the FHIR Repository (PUT if resources have ID, POST otherwise)
function putResources(files) {

  var host = options.host || defaultOptions.host;
  var port = options.port || defaultOptions.port;
  var path = options.path || defaultOptions.path;
  var auth = options.auth || undefined;
  var protocol = options.protocol || defaultOptions.protocol;

  if (host.startsWith('https://')) { host = host.substring(8); }
  else if (host.startsWith('http://')) { host = host.substring(7); }
  if (host.endsWith('/')) { host = host.substring(0, host.length - 1); }
  if (!path.startsWith('/')) { path = '/' + path; }
  if (!path.endsWith('/')) { path = path + '/'; }

  const promises = [];

  files.forEach(function (val, index, array) {
    promises.push(new Promise(resolve => {
      fs.readFile(val, 'utf8', function (err,data) {
        if (!err) {
          try{
            var obj = JSON.parse(data);
            var type = obj.resourceType;
            var id = obj.id;
            var headers = {
              'Content-Type': 'application/fhir+json;charset=UTF-8',
              'Accept': 'application/fhir+json;charset=UTF-8'
            };
            if (auth) {
              headers.Authorization = 'Bearer ' + auth;
            }
            var options = {
              host: host,
              port: port,
              path: path + type + "/" + (id || ''),
              headers: headers,
              method: id ? 'PUT' : 'POST'
            }


          	var req = http.request(options, function(res) {
          	  res.setEncoding('utf8');
          	  let response = '';
          	  res.on('data', function (chunk) {
          	    response += chunk;
          	  });
          	  res.on('end', function() {
          	  	try{
          				var resp = JSON.parse(response);
          				if(resp && resp.resourceType == type){
                    resolve([val, true, resp]);
          					console.warn("\033[32m" + val," created successfully.\033[;;m");
          				}
          				else if(resp && resp.issue){
                    resolve([val, false]);
          					console.warn("\033[31m" + val," failed.\033[;;m");
          					for(var issue of resp.issue){
          						if(issue.severity == "error"){
          							console.warn("Error", issue.diagnostics);
          						}
          					}
          				}
          	    } catch(parseError){ console.warn(response, parseError); resolve([val, false]); }
          	  });
          	});
          	req.on('error', function(e) {
              resolve([val, false]);
          	  console.warn('problem with request: ' + e.message);
          	});
          	req.write(data);
          	req.end();
          }
          catch(e){
            resolve([val, false]);
    	       console.warn(e);
          }
        }
      });
    }));
  });
  return new Promise(resolve => {
    Promise.all(promises).then(results => {
      const resultsJson = {};
      results.forEach(result => resultsJson[result[0]] = result[1] && result[2]);
      resolve(resultsJson);
    });
  });
}

/** @module Putter */
module.exports = {
  /** Send resources from given files to the FHIR Repository */
  put: putResources,
  /** Get Default Options */
  defaultOptions: defaultOptions, // TODO: not needed, remove in future versions
  /** set/get fhir repository options (set if _options argument exists, get otherwise) */
  conf: (_options) => {
    if (_options) {
      const authOptions = options.authOptions;
      options = _options;
      if (!options.authOptions) {
        options.authOptions = authOptions;
      }
    }
    return options;
  },
  /** set/get OAuth options (set if _options argument exists, get otherwise) */
  authConf: (_conf) => {
    if (_conf) {
      options.authOptions = _conf;
    }
    return options.authOptions;
  },
  /** set the bearer token to be used in requests */
  setToken: (token) => {
    options.auth = token;
  }
}
