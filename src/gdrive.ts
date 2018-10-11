const XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
const gdriveConfig = require("./gdrive.config.json");
let files = [];

async function getFileListPromised(apiKey, folderId, jsonSTR) {
    try {
        let nextPageToken = "";
        let previousToken = "";
        let iteration = 0;
        const cbChar = String.fromCharCode(Math.random() * 26 + 65);
        console.log("\nloading file list-" + cbChar + "\n");
        do {
            previousToken = nextPageToken;
            iteration = iteration + 1;

            console.log(cbChar);
            let x = await httpGetPromised(createQuery(nextPageToken, apiKey, folderId));
            let doc = JSON.parse(x);
            //console.log("DC", doc.nextPageToken);
            nextPageToken = doc.nextPageToken;
            for (let z of doc.files) {
                if (z === undefined) {
                    continue;
                }
                z.APIKey = apiKey;
                files.push(z);
            }
        }
        while (nextPageToken !== undefined || nextPageToken === previousToken);
        console.log("\nloaded:'" + cbChar + "'" + files.length + "\n");
        return files;
    }
    catch (E) {
        process.stderr.write("ERR in gflProm\n\n");
        process.stderr.write(E);
    }
}

function createQuery(pageTokenValue, apiKey, folderId) {
    if (pageTokenValue === undefined) {
        pageTokenValue = "";
    }
    let query = {
        baseURL: "https://www.googleapis.com/drive/v3/files?",
        parameters: {
            pageSize: 1000,
            q: "%27" + folderId + "%27+in+parents",
            key: apiKey,
            pageToken: pageTokenValue
        }

    };
    query.getURL = function () {
        let queryStr = "";
        for (let z in this.parameters) {
            queryStr += "&" + z + "=" + this.parameters[z];
        }
        queryStr = gdriveConfig.RestURL + "?" + queryStr.substring(1);
        return queryStr;
    }
    return query.getURL();
}

async function httpGetPromised(theUrl) {
    return await new Promise((resolve, reject) => {
        let xmlHttp = new XMLHttpRequest();
        xmlHttp.onreadystatechange = function () {
            if (xmlHttp.readyState === 4 && xmlHttp.status === 200) {
                let str = xmlHttp.responseText;
                // console.log("http Return", str.length);
                resolve(str);
            }
        }
        xmlHttp.open("GET", theUrl, true); // true for asynchronous
        xmlHttp.send(null);
    });
}

async function loadFilesPromised() {
    let ar = [];
    await Promise.all(gdriveConfig.Data.map((element) =>
        getFileListPromised(element.key, element.folder)
            .then(x => ar.push(...x))
            .catch(x => process.stderr.write("ERROR in getFileListPromised" + JSON.stringify(x)))
    ));
    return ar;
}

async function loadFile(key) {
    return await httpGetPromised(gdriveConfig.FileURL + key);
}

function getFiles() {
    return files;
}

module.exports =
    {
        gdriveConfig,
        httpGetPromised,
        loadFilesPromised,
        loadFile,
        getFiles
    };