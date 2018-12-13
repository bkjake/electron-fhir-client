# Electron FHIR Client

A client for pushing resources to an HL7 FHIR Repository with the OAuth integration (see [OnFHIR](https://onfhir.io/) and [OnAuth](https://onfhir.io/configuration.html#section5) integrated plug-and-play server implementations).

### Usage

    git clone git@github.com:bunyaminsg/electron-fhir-client.git && cd electron-fhir-client
    npm install

Open `conf.json` and make all necessary configurations. Then, run:

    npm start

### Packaging

##### For Linux
    npm run package-linux

##### For Windows
    npm run package-win

##### For MacOS
    npm run package-mac

Packaged folders will be at `../fhir-client-release-builds`. You can change the path from the scripts in `package.json`.