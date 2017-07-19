const fs = require('fs');
const Imagery = require('./Imagery.js').Imagery;
const usrFileName = "./users.json";
const imageryCacheName = "./imagery.json";
var users = {};
var fileLocked = false;

function loadUsers() {
    fs.readFile(usrFileName, (err, data) => {
        if (err) throw err;
        if (data == "") {
            return;
        }
        users = JSON.parse(data);
    });
}
function saveUsers() {
    if (!fileLocked) {
        fileLocked = true;
        var json = JSON.stringify(users);
        fs.writeFile(usrFileName, json, 'utf8', function (err) {
            if (err) throw err;
            fileLocked = false;
        })
    }
}
function loadImageryPromised() {
    return new Promise((resolve, reject) => {
        fs.readFile(imageryCacheName, (err, data) => {
            if (err) {
                reject(err);
                console.log("ERR");
                return;
            }
            resolve(new Imagery(data));
            return;
        });
    });
}
function optionify(obj) {
    let optionObj = {};
    for (let key of Object.keys(obj)) {
        optionObj[key] = {
            value: obj[key]
        };
    }
    return optionObj;
}
function saveImagery(imagery) {
    if (!fileLocked) {
        fileLocked = true;
        fs.writeFile(imageryCacheName, JSON.stringify(imagery), 'utf8', function (err) {
            if (err) throw err;
            fileLocked = false;
        })
    }
}
function registerUser(msg) {
    let uid = msg.chat.id;
    users[uid] = new user(uid, { from: msg.from, chat: msg.chat });
    saveUsers();
}
function getUser(uid) {
    return users[uid];
}
function getUserList() {
    return Object.keys(users);
}
function setMetaData(uid, key, val) {
    users[uid].data[key] = val;
    saveUsers();
}
function getMetaData(uid, key) {
    return users[uid].data[key];
}
function getSettings(uid) {
    return users[uid].Settings;
}
function getSubscriptedUsers() {
    return Object.keys(users).filter(uid => users[uid].Settings.autoSend).map(x => users[x]);
}
class Settings {
    constructor() {
        this.autoSend = false;
        this.selectedModes = ["therm", "msa"];
    }
    assert() {
        /* */
    }
}
class user {
    constructor(uid, meta) {
        this.uid = uid;
        this.enabled = true;
        this.meta = meta;
        this.Settings = new Settings();
    }
    assert() {
        /* */
    }
}

module.exports = {
    loadUsers,
    loadImageryPromised,
    saveImagery,
    saveUsers,
    user,
    Settings,
    registerUser,
    getUser,
    getUserList,
    setMetaData,
    getMetaData,
    getSubscriptedUsers
};
