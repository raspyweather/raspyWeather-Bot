const Telegraf = require('telegraf');
const {
    Extra,
    Markup
} = require('telegraf');
const sys = require('sys');
const child_process = require('child_process');
const { promisify } = require('util');
const config = require('./config');
const util = require('util');
const dataService = require('./dataService');
const Imagery = require('./Imagery.js').Imagery;
const gdrive = require('./gdrive.js');
const fs = require('fs');
const bot = new Telegraf(config.botToken);
const helpMsg = `Manual
/start - Start bot.
/get - Get the newest images based on your selection
/select - Select which modes you want to get
/getAudio - Get the latest satellite pass recording
/getAll - Get all Images from the newest satellite pass
/stop - Stop.
/help - Show this.
/about -Show creator's information`;
const aboutMsg = "This bot was created by @Athlon4400";
const stopMsg = "Don't blame me for the next storm";
const startMsg = "Hello, I'm the raspyweather bot!";
const audioPath = "/FTP/wxotimg/audio/";
let newestDate = null;
let images = null;

//startup Stuff
dataService.loadUsers();

//get username for group command handling
bot.telegram.getMe().then((botInfo) => {
    bot.options.username = botInfo.username;
    console.log("\nInitialized" + botInfo.username + "\n");
});
function logMsg(ctx) {
    //log messages.
    console.log('\n< ' + ctx.message.text + ' ' + JSON.stringify(ctx.from.id == ctx.chat.id ? ctx.from : { from: ctx.from, chat: ctx.chat }) + "\n\n");
    console.log('\n< ' + ctx.message.text + ' ' + JSON.stringify(ctx.from.id == ctx.chat.id ? ctx.from : { from: ctx.from, chat: ctx.chat }));
    console.log('\n\n');
}
function logOutMsg(ctx, text) {
    //log replies
    console.log('\n> ' + {
        id: ctx.chat.id
    } + " " + text);
    console.log('\n\n');
}

bot.command('broadcast', ctx => {
    // send message to every bot user
    if (ctx.from.id == config.adminChatId) {
        var words = ctx.message.text.split(' ');
        words.shift(); //remove first word (which ist "/broadcast")
        if (words.length == 0) //don't send empty message
            return;
        var broadcastMessage = words.join(' ');
        var userList = dataService.getUserList();
        console.log("\nSending broadcast message to", userList.length, "users:  ", broadcastMessage, "\n");
        userList.forEach(userId => {
            console.log("\n>", { id: userId }, broadcastMessage);
            ctx.telegram.sendMessage(userId, broadcastMessage);
        });
    }
});
bot.command('start', ctx => {
    // should be changed later.
    logMsg(ctx);
    dataService.registerUser(ctx);
    ctx.reply(startMsg);
    logOutMsg(ctx, startMsg);
    setTimeout(() => {
        ctx.reply(0);
        logOutMsg(ctx, 0)
    }, 50); //workaround to send this message definitely as second message
});
bot.command('subscribe', ctx => {
    //enable autonotification
    dataService.getUser(ctx.from.id).Settings.autoSend = true;
    dataService.saveUsers();
    ctx.reply("The bot will notify you soon about new data, use /stop if you want no notifications anymore");
});


bot.command('stop', ctx => {
    //disable autonotification
    logMsg(ctx);
    var m = "Don't blame me for the next hazard";
    dataService.getUser(ctx.from.id).Settings.autoSend = false;
    logOutMsg(ctx, m);
    ctx.reply(m);
});/*
bot.command('ping', ctx => {
    exec("ping 8.8.8.8 -c 1").
});*/
bot.command('help', ctx => {
    //show help about commands
    logMsg(ctx);
    logOutMsg(ctx, helpMsg);
    ctx.reply(helpMsg);
});
bot.command('about', ctx => {
    //show information about this bot
    logMsg(ctx);
    logOutMsg(ctx, aboutMsg);
    ctx.reply(aboutMsg);
});
bot.command('get2', ctx => {
    logMsg(ctx);
    let usr = dataService.getUser(ctx.from.id);
    if(images.Dates.length<3){
        ctx.reply("no image found");
        return;
    }
    let dat = images.Dates[1];
    let settings = usr.Settings;
    ctx.replyWithMarkdown("Latest Satellite pass:\n`" + images.DateUtility.GetDINNotation(dat) + "`");
    for (let modeStr of settings.selectedModes) {
        //new image found
        if (images.Data[dat] != undefined && images.Data[dat].ModeIds.indexOf(images.ImageModes.indexOf(modeStr)) > -1) {
            let stuff = images.GetImageLinkFromExactDate(dat, modeStr);
            sendImage(ctx, stuff, modeStr, dat, images.Data[dat].Sat);
            logOutMsg(ctx, stuff);
        }
        //returning older Image
        else {
            let stuff = images.GetImageLinkAndDateNewestMode(dat, modeStr);
            sendImage(ctx, stuff.link, modeStr, stuff.date, images.Data[stuff.date].Sat);
            logOutMsg(ctx, stuff);
        }
    }
});
bot.command('get3', ctx => {
    logMsg(ctx);
    let usr = dataService.getUser(ctx.from.id);
    if(images.Dates.length<4){
        ctx.reply("no image found");
        return;
    }
    let dat = images.Dates[2];
    let settings = usr.Settings;
    ctx.replyWithMarkdown("Latest Satellite pass:\n`" + images.DateUtility.GetDINNotation(dat) + "`");
    for (let modeStr of settings.selectedModes) {
        //new image found
        if (images.Data[dat] != undefined && images.Data[dat].ModeIds.indexOf(images.ImageModes.indexOf(modeStr)) > -1) {
            let stuff = images.GetImageLinkFromExactDate(dat, modeStr);
            sendImage(ctx, stuff, modeStr, dat, images.Data[dat].Sat);
            logOutMsg(ctx, stuff);
        }
        //returning older Image
        else {
            let stuff = images.GetImageLinkAndDateNewestMode(dat, modeStr);
            sendImage(ctx, stuff.link, modeStr, stuff.date, images.Data[stuff.date].Sat);
            logOutMsg(ctx, stuff);
        }
    }
});
bot.command('get', ctx => {
    logMsg(ctx);
    let usr = dataService.getUser(ctx.from.id);
    let dat = images.GetNewestDate();
    let settings = usr.Settings;
    ctx.replyWithMarkdown("Latest Satellite pass:\n`" + images.DateUtility.GetDINNotation(dat) + "`");
    for (let modeStr of settings.selectedModes) {
        //new image found
        if (images.Data[dat] != undefined && images.Data[dat].ModeIds.indexOf(images.ImageModes.indexOf(modeStr)) > -1) {
            let stuff = images.GetImageLinkFromExactDate(dat, modeStr);
            sendImage(ctx, stuff, modeStr, dat, images.Data[dat].Sat);
            logOutMsg(ctx, stuff);
        }
        //returning older Image
        else {
            let stuff = images.GetImageLinkAndDateNewestMode(dat, modeStr);
            sendImage(ctx, stuff.link, modeStr, stuff.date, images.Data[stuff.date].Sat);
            logOutMsg(ctx, stuff);
        }
    }
});
bot.command('getAudio', async function (ctx) {
    logMsg(ctx);
    try {
        let readDir = util.promisify(fs.readdir);
        let list = await readDir(audioPath);
        let ar = list.map(name => {
            return {
                file: name,
                date: new Date(name.substring(0, 4) + "/" +
                    name.substring(4, 6) + "/" +
                    name.substring(6, 8) + "/" +
                    name.substring(8, 10) + ":" +
                    name.substring(10, 12))
            };
        }).sort((x, y) => { return y.date.getTime() - x.date.getTime(); });
        ctx.reply("Audio file is being uploaded. Please be patient. ")
        await ctx.replyWithVoice(
            { source: fs.createReadStream(audioPath + ar[0].file) },
            { caption: "noaa" + images.Data[ar[0].date].Sat + " " + images.DateUtility.GetDINNotation(ar[0].date) });
    } catch (Err) {
        console.log(Err);
        return;
    }
});
function createModeButtons(selectedModes) {
    let tmp = [];
    let inlineData = [];
    let rowCnt = 3;
    images.ImageModes.forEach((val, i) => {
        if (i % rowCnt == 0) { tmp = []; }
        tmp.push(Markup.callbackButton(val + (selectedModes.indexOf(val) > -1 ? "✅ " : ""), "modeSelect_" + val));
        if (i % rowCnt == rowCnt - 1) { inlineData.push(tmp); }
    });
    return inlineData;
}
bot.command('kill', async function (ctx) {
    if (ctx.from.id == config.adminChatId) {
        await ctx.reply("commiting suicide now.");
        console.log("kill");
        images=new Imagery();
        images = await dataService.loadImageryPromised();
        return;
    }
    else {
        ctx.reply("Sorry, you're not allowed to use this command.");
    }
});
bot.command('select', async function (ctx) {
    //update selected modes [not implemented yet... :( ]
    logMsg(ctx);
    let user = dataService.getUser(ctx.chat.id);
    if (user.selectMessage !== undefined) {
        console.log("deleting ", ctx.chat.id, user.selectedMessage);
        //   await ctx.deleteMessage(ctx.chat.id,user.selectMessage.message_id);
    }
    let res = await ctx.reply('Please select your favourite image modes:',
        Extra.HTML().markup(Markup.inlineKeyboard(createModeButtons(user.Settings.selectedModes))));
    dataService.getUser(ctx.chat.id).selectMessage = {
        message_id: res.message_id,
        date: res.date
    };
    dataService.saveUsers();
    console.log(res);
    logOutMsg(ctx, aboutMsg);
});
bot.command('getMeta', ctx => {
    //send some weird statistics...
    //will be extended later [maybe]
    logMsg(ctx);
    ctx.reply(
        "\nNumber of flights: " + images.Dates.length +
        "\nOldest pass: " + images.DateUtility.GetDINNotation(images.GetOldestDate()) +
        "\nNewest pass: " + images.DateUtility.GetDINNotation(images.GetNewestDate()) +
        "\nNr. of ImageModes: " + images.ImageModes.length +
        "\nNr. of Images: " + images.Dates.map(x => images.Data[x].ModeIds.length).reduce((x, y) => x + y)
    );
    logOutMsg(ctx, aboutMsg);
});
bot.command('getDates', ctx => {
    let str = "Last satellite passes:";
    for (let i = 0; i < 5 && i < images.Dates.length; i++) {
        str += "\n`" + images.DateUtility.GetDINNotation(images.Dates[i]) + "`";
    }
    ctx.replyWithMarkdown(str);

});
bot.command('getAll', ctx => {
    // return all images of the last satellite pass
    let data = images.Data[newestDate];
    for (let modeIdx of data.ModeIds) {
        sendImage(ctx,
            images.GetImageLinkFromId(data.IDs[modeIdx]),
            images.ImageModes[modeIdx],
            newestDate,
            images.Data[newestDate].Sat);
    }
});
bot.action(/modeSelect_.+/,
    (msg, { deleteMessage, message_id }) => {
        let usr = dataService.getUser(msg.chat.id);
        let modeStr = msg.callbackQuery.data.replace('modeSelect_', '');
        if (usr.Settings.selectedModes.indexOf(modeStr) > -1) {
            usr.Settings.selectedModes = usr.Settings.selectedModes.filter(x => x != modeStr);
        }
        else {
            usr.Settings.selectedModes.push(modeStr);
        }
        dataService.saveUsers();
        msg.editMessageText(usr.Settings.selectedModes.reduce((x, y) => x + ", " + y) + "selected ",
            Extra.HTML().markup(Markup.inlineKeyboard(createModeButtons(usr.Settings.selectedModes))));
        //msg.editMessageReplyMarkup
        /*msg.editMessageText(msg.chat.id, msg.callbackQuery.message.message_id,  msg.callbackQuery.message.message_id, 'Please select your favourite image modes:' + 'u',
            Extra.HTML().markup(Markup.inlineKeyboard(createModeButtons(usr.Settings.selectedModes))));*/
    });
function sendImage(ctx, url, modeStr, date, sat) {
    ctx.replyWithPhoto(url,
        {
            caption: "Mode:\t" + modeStr +
            "\n Date:\t" + images.DateUtility.GetDINNotation(date) +
            "\n Satellite:\tnoaa" + sat
        });
}

console.log("bot started");
async function updateDB() {
    try {
        //load imageCache
        images = await dataService.loadImageryPromised();
        newestDate = images.GetNewestDate();
        let files = await gdrive.loadFilesPromised();
        images.processData(files);
        dataService.saveImagery(images);
        let tmpDate = images.GetNewestDate();
        // if newestDate is null, images haven't been updated yet.
        console.log("Dates:");
        console.log(images.DateUtility.GetDINNotation(newestDate), images.DateUtility.GetDINNotation(tmpDate));
        if (newestDate != null && tmpDate == undefined || newestDate != undefined && tmpDate != undefined && newestDate.getTime() != tmpDate.getTime()) {
            console.log("\rdb updated " +
                images.DateUtility.GetDINNotation(newestDate) + " " +
                images.DateUtility.GetDINNotation(images.GetNewestDate()));

            //get users which want to be notified
            let users = dataService.getSubscriptedUsers();
            console.log("\n" + users.length + " users will be notified\n");
            users.forEach(user => {
                let selectedModes = user.Settings.selectedModes;
                let data = images.Data[tmpDate];
                //send information about the satellite pass
                bot.telegram.sendMessage(user.uid, "Satellite noaa" + data.Sat + " passed at " + images.DateUtility.GetDINNotation(tmpDate));
                selectedModes.forEach(modeStr => {
                    //send every image which is selected
                    let mIdx = images.ImageModes.indexOf(modeStr);
                    if (mIdx > -1 && data.ModeIds.indexOf(mIdx) > -1) {
                        bot.telegram.sendPhoto(user.uid, {
                            url: images.GetImageLinkFromId(data.IDs[mIdx])
                        });
                        //                        bot.telegram.sendPhoto(user.uid, { source: images.GetImageLinkFromId(data.IDs[mIdx]) }, { caption: modeStr });
                    }
                });
            });
        }
        else {
            // no newer satellite pass detected
            console.log("\rdb not updated " + images.DateUtility.GetDINNotation(new Date()));
        }
        newestDate = tmpDate;
    }
    catch (e) {
        process.stderr.write(JSON.stringify(e));
        console.log(JSON.stringify(e));
    }
    setTimeout(updateDB, 60 * 5 * 1000);
};

async function startup() {
    //wait until DB got updated before starting the bot
    console.log("updating DB.");
    await updateDB();
    console.log("updated DB.Bot starts now polling.");
    bot.startPolling();
}

startup();

module.exports = {
    images,
    updateDB,
    bot
}
