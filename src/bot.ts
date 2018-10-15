import { DataService } from "./dataService";
const Telegraf = require('telegraf');
const child_process = require('child_process');
import config from './config';
import { FileDate } from "./FileDate";
import { UserService } from "./userservice";
import { ImageCollection } from "./imageCollection";

const dataService = new DataService();
const userService = new UserService();
const fs = require('fs');
const bot = new Telegraf(config.botToken);
const stopMsg = "Really? I thought we were friends :(";
const startMsg = "Hello, I'm the raspyweather bot!";
const audioPath = "/FTP/wxotimg/audio/";


bot.telegram.getMe().then((botInfo: any) => {
    bot.options.username = botInfo.username;
    console.log("\nInitialized" + botInfo.username + "\n");
});

function logMsg(ctx: any) {
    //log messages.
    console.log('\n< ' + ctx.message.text + ' ' + JSON.stringify(ctx.from.id === ctx.chat.id ? ctx.from : {
        from: ctx.from,
        chat: ctx.chat
    }) + "\n\n");
    console.log('\n< ' + ctx.message.text + ' ' + JSON.stringify(ctx.from.id === ctx.chat.id ? ctx.from : {
        from: ctx.from,
        chat: ctx.chat
    }));
    console.log('\n\n');
}

function logOutMsg(ctx: any, text: string) {
    //log replies
    console.log('\n> ' + {
        id: ctx.chat.id
    } + " " + text);
    console.log('\n\n');
}

function logProcessResult(ctx: any) {
    return (err: any, stdout: any) => {
        if (err !== undefined && err !== null) {
            ctx.reply('ERROR' + err);
        }
        if (stdout && stdout !== null) {
            ctx.reply(stdout);
        }
    };
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
            message: `Manual
/start - Start bot.
/get - Get the newest images based on your selection
/select - Select which modes you want to get
/getAudio - Get the latest satellite pass recording
/getAll - Get all Images from the newest satellite pass
/stop - Stop.
/help - Show this.
/about -Show creator's information`
        },
        {
            name: 'about',
            message: 'This bot was created by @Athlon4400'
        }
    ];

    publicCommands.forEach(command =>
        bot.command(command.name, (ctx: any) => child_process.exec(command.command, logProcessResult(ctx))));
    adminCommands.forEach(command =>
        bot.command(command.name, (ctx: any) => {
            if (ctx.from.id === config.adminChatId) {
                child_process.exec(command.command, logProcessResult(ctx));
            }
        }));
    textCommands.forEach(command =>
        bot.command(command.name, (ctx: any) => ctx.reply(command.message)));
    console.log('commands set up');
}


bot.command('get', (ctx: any) => {
    logMsg(ctx);
    dataService.getImages().then(images => {
        const newestDate = images.getNewestDate();
        ctx.replyWithMarkdown("Latest Satellite pass:\n```" + ((newestDate !== undefined) ? newestDate.getIdentifier() : "no dates available") + "```");
    });
});
bot.command('getTodaysImages', (ctx: any) => {
    logMsg(ctx);
    dataService.getImages().then(images => {

        const dates = images.getDatesSameDay(FileDate.now());

        //    ctx.reply(datesSince.map(date => date.getIdentifier()).reduce((prev, current) => current + '\n' + prev, ''));
    });
});
function getImage(images: ImageCollection, ctx: any, date: FileDate, modes: string[]) {
    const replyImages = images.getImageForFlight(date, modes);
    replyImages.forEach(image => {
        ctx.replyWithPhoto({ url: image.imageUrl },
            {
                caption: image.satelliteName + "\n" + image.date.getIdentifier() + "\n" + image.imageMode
            });
    });
}
bot.command('getImages', (ctx: any) => {
    logMsg(ctx);
    dataService.getImages().then(images =>
        userService.getUser(ctx.user.id).then(user => {
            const newestDate = images.getNewestDate();
            if (newestDate === undefined) { return; }
            getImage(images, ctx, newestDate, user.preferedModes);
        }));
});
bot.command('getAllImages', (ctx: any) => {
    logMsg(ctx);
    dataService.getImages().then(images => {
        images.getImageForFlight(images.getNewestDate() || FileDate.now(), []).forEach(image =>
            ctx.replyWithPhoto({ url: image.imageUrl },
                {
                    caption: image.satelliteName + "\n" + image.date.getIdentifier() + "\n" + image.imageMode
                }));
    });
});

const reloadTime = 100000;
function startup() {
    //wait until DB got updated before starting the bot
    console.log("updating DB.");
    dataService.loadData().then((images) => {
        console.log("updated DB.Bot starts now polling.");
        console.log({ newest: images.sort().reverse()[0] })
        bot.startPolling();
        setTimeout(() => reload(), reloadTime);
    });
}

function reload() {
    dataService.loadData().then(() => {
        setTimeout(() => reload(), reloadTime);
        console.log('successfully reloaded');
    }).catch(() => {
        console.log('error while loading- retrying');
        reload();
    });
}

setupMonitorCommands();
startup();