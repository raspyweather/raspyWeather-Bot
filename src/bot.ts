import { DataService } from "./dataService";
const Telegraf = require('telegraf');
const child_process = require('child_process');
import config from './config';
import { FileDate } from "./FileDate";
import { UserService, User } from "./userservice";
import { ImageCollection } from "./imageCollection";
import { ImageInfo } from "./ImageInfo";
const Extra = require('telegraf/extra')
const dataService = new DataService();
const userService = UserService.create();
const bot = new Telegraf(config.botToken);

interface ParamterCollection {
    images: ImageCollection,
    user: User
}


bot.telegram.getMe().then((botInfo: any) => {
    bot.options.username = botInfo.username;
    console.log("\nInitialized" + botInfo.username + "\n");
});

async function log(func: (ctx: any, parameters: ParamterCollection) => Promise<void>): Promise<(ctx: any, parameters: ParamterCollection) => Promise<void>> {
    return async (ctx) => {
        try {
            console.log('\n< ' + JSON.stringify({
                'ctxChat': ctx.chat, 'ctxFrom': ctx.from, 'ctxM': ctx.message
            }) + "\n\n");
            const images = await dataService.getImages();
            const user = await userService.getUser(ctx.chat.id);
            await func(ctx, <ParamterCollection>{ images, user });
        }
        catch (e) {
            console.error(e);
        }

    };
}


function logProcessResult(ctx: any) {
    return log(async (err: any, stdout: any) => {
        if (err !== undefined && err !== null) {
            await ctx.reply('ERROR' + err);
        }
        if (stdout && stdout !== null) {
            await ctx.reply(stdout);
        }
    });
}
function setupMonitorCommands() {
    const publicCommands = [
        {
            name: 'ping',
            command: 'ping 8.8.8.8'
        },
        {
            name: 'speedtest',
            command: 'speedtest-cli --simple'
        }
    ];
    const adminCommands = [
        {
            name: 'shutdown',
            command: 'shutdown -r now'
        }
    ];
    const textCommands = [
        {
            name: 'help',
            message: `Manual:
/start - Start bot.
/get - Gets the newest images
/getDates - Get the last 10 satellite record dates
/getTodaysImages - Get images from all satellite passes today
/select - Select which modes you want to get
/getAudio - Get the latest satellite pass recording
/getAll - Get all Images from the newest satellite pass
/stop - Stop.
/help - Show this.
/about -Show creator's information`
        },
        {
            name: 'about',
            message: 'This bot was created by @Athlon4400.\n Visit https://raspyweather.github.io or github.com/raspyweather for more cool stuff!'
        }
    ];

    publicCommands.forEach(command =>
        bot.command(command.name, log(async (ctx: any) => child_process.exec(command.command, logProcessResult(ctx)))));
    adminCommands.forEach(command =>
        bot.command(command.name, log(async (ctx: any) => {
            if (ctx.from.id === config.adminChatId) {
                child_process.exec(command.command, logProcessResult(ctx));
            }
        })));
    textCommands.forEach(command => bot.command(command.name, log(async (ctx: any) => ctx.reply(command.message))));
    console.log('commands set up');
}


bot.command('getDates', log(async (ctx: any, par: ParamterCollection) => {
    const newestDate = par.images.getNewestDate();
    await ctx.replyWithMarkdown("Latest Satellite pass:\n`" + ((newestDate !== undefined) ? newestDate.toHumanReadableDate() : "no dates available") + "`");
}));
bot.command('getTodaysImages',
    log(async (ctx: any, par: ParamterCollection) =>
        Promise.all(par.images.getDatesSameDay(FileDate.now()).map(
            date => sendImages(par.images, par.user, FileDate.fromIdentifier(date), par.user.preferedModes, par.user.showDetails))).then(() => { })
    ));

function imageInfoToString(imageInfo: ImageInfo) {
    return `Satellite:\t${imageInfo.satelliteName}
Date:\t${imageInfo.date.toHumanReadableDate()}
Mode:\t${imageInfo.imageMode}`;
}
async function sendImages(images: ImageCollection, user: User, date: FileDate, modes: string[], useDetail: boolean = false) {
    const replyImages = images.getImageForFlight(date, modes);
    console.log(replyImages);
    if (useDetail) {
        await Promise.all(replyImages.map(image => {
            bot.telegram.sendPhoto(user.userId, {
                media: image.imageUrl,
                caption: imageInfoToString(image)
            });
        }));
    } else {
        const stuff = replyImages.map(image => {
            return {
                type: 'photo',
                url: image.imageUrl,
                media: image.imageUrl,
                caption: imageInfoToString(image)
            }
        });
        const arrays = [];
        while (stuff.length > 10) {
            arrays.push(stuff.splice(stuff.length - 10, stuff.length));
        }
        if (stuff.length > 0) { arrays.push(stuff); }
        console.log(stuff);
        await Promise.all(arrays.map(image => bot.telegram.sendMediaGroup(user.userId, image)));
    }
    console.log("images sent");
}

function setupConfigurationCommands() {
    const makeButtons = (modes: string[], user: User) =>
        Extra.HTML().markup((m: any) => m.inlineKeyboard([m.callbackButton('Finish', 'clearSelectMessage_mode'),
        ...modes.map(mode => m.callbackButton(((user.preferedModes.indexOf(mode) > -1) ? "✅ " : "") + mode, 'modeSelect_' + mode))
        ], { columns: 3 }));

    const makeSelectionText = (modes: string[]) => `Please select your prefered modes.\n Currently selected: ${modes.join(',') || 'none'};`;

    bot.command('select', log(async (ctx: any, par: ParamterCollection) => {
        const modes = par.images.getImageModes();
        const buttons = makeButtons(modes, par.user);
        await ctx.reply(makeSelectionText(par.user.preferedModes), buttons);
    }));
    bot.command('setDetailLevel', log(async (ctx: any, par: ParamterCollection) => {
        const currentLevel = par.user.showDetails;
        await ctx.reply(`You can set now the way this bot delivers images to you. You can decide whether you want the bot using mediagroups or dedicated messages.\nYour current selection is: ${(currentLevel) ? '🌄Dedicated Photos' : '📒Album'}`,
            Extra.HTML().markup((m: any) => m.inlineKeyboard([
                m.callbackButton('Albums', 'setDetailLevel_Album'),
                m.callbackButton('Dedicated Photo', 'setDetailLevel_Dedicated')
            ], { columns: 2 })));
    }));
    bot.action(/setDetailLevel_.+/, log(async (msg: any, par: ParamterCollection) => {
        let detailLevel = msg.callbackQuery.data.replace('setDetailLevel_', '');
        if (detailLevel === 'Dedicated') {
            par.user.showDetails = true;
        }
        if (detailLevel === 'Album') {
            par.user.showDetails = false;
        }
        await userService.updateUser(par.user);
        await msg.deleteMessage();
    }));
    bot.action(/clearSelectMessage.+/, log(async (msg: any) => {
        console.log('clear');
        await msg.deleteMessage();
    }));
    bot.action(/modeSelect_.+/, log(async (msg: any, par: ParamterCollection) => {
        let user = par.user;
        let modeStr = msg.callbackQuery.data.replace('modeSelect_', '');
        if (user.preferedModes.indexOf(modeStr) > -1) {
            user.preferedModes = user.preferedModes.filter(x => x != modeStr);
        }
        else {
            user.preferedModes.push(modeStr);
        }
        const modes = (await dataService.getImages()).getImageModes();
        await userService.updateUser(user);
        user = await userService.getUser(msg.chat.id);
        await msg.editMessageText(makeSelectionText(user.preferedModes), makeButtons(modes, user));
    }));
}


bot.command('get', log(async (ctx: any, par: ParamterCollection) => {
    const newestDate = await par.images.getNewestDate();
    if (newestDate === undefined) { console.log('no date available'); return; }
    await sendImages(par.images, par.user, newestDate, par.user.preferedModes);
}));
bot.command('getAllImages', log(async (ctx: any, par: ParamterCollection) => {
    const newestDate = par.images.getNewestDate();
    if (newestDate === null || newestDate === undefined) { console.log('no dates available'); return; }
    await sendImages(par.images, par.user, newestDate, [], par.user.showDetails);
}));

const reloadTime = 100000;
function startup() {
    //wait until DB got updated before starting the bot
    console.log("updating DB.");
    dataService.loadData().then((images) => {
        console.log("updated DB.Bot starts now polling.");
        console.log({ newest: images.sort().reverse()[0] })
        bot.startPolling();
        setTimeout(async () => await reload(), reloadTime);
    });
}

async function reload() {
    try {
        const newDates = await dataService.loadData();
        const images = await dataService.getImages();
        const users = await userService.getAllUsers();
        const usersToNotify = users.filter(user => user.autoSend);

        await Promise.all(newDates.map(
            date => Promise.all(usersToNotify.map(
                user => sendImages(images, user, date, user.preferedModes, user.showDetails)))));



        dataService.loadData().then(() => {
            setTimeout(() => reload(), reloadTime);
            console.log('successfully reloaded');
        }).catch(() => {
            console.log('error while loading- retrying');
            reload();
        });
    } catch (e) {
        console.error(e);
    }
}

setupMonitorCommands();
setupConfigurationCommands();
startup();