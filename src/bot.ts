import { DataService } from "./dataService";
const Telegraf = require('telegraf');
const child_process = require('child_process');
import config from './config';
import { FileDate } from "./FileDate";

const dataService = new DataService();
const fs = require('fs');
const bot = new Telegraf(config.botToken);
const stopMsg = "Really? I thought we were friends :(";
const startMsg = "Hello, I'm the raspyweather bot!";
const audioPath = "/FTP/wxotimg/audio/";


bot.telegram.getMe().then(botInfo => {
    bot.options.username = botInfo.username;
    console.log("\nInitialized" + botInfo.username + "\n");
});

function logMsg(ctx) {
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

function logOutMsg(ctx, text: string) {
    //log replies
    console.log('\n> ' + {
        id: ctx.chat.id
    } + " " + text);
    console.log('\n\n');
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
        bot.command(command.name, ctx => child_process.exec(command.command, (err, stdout) => {
            if (err !== undefined && err !== null) {
                ctx.reply('ERROR' + err);
            }
            if (stdout && stdout !== null) {
                ctx.reply(stdout);
            }
        })));
    adminCommands.forEach(command =>
        bot.command(command.name, ctx => {
            if (ctx.from.id === config.adminChatId) {
                child_process.exec(command.command, (err, stdout) => {
                    if (err !== undefined && err !== null) {
                        ctx.reply('ERROR' + err);
                    }
                    if (stdout && stdout !== null) {
                        ctx.reply(stdout);
                    }
                });
            }
        }));
    textCommands.forEach(command =>
        bot.command(command.name, ctx => ctx.reply(command.message)));
    console.log('commands set up');
}


bot.command('get', ctx => {
    logMsg(ctx);
    dataService.getImages().then(images => {
        const newestDate = images.getNewestDate();
        ctx.replyWithMarkdown("Latest Satellite pass:\n```" + ((newestDate !== undefined) ? newestDate.getIdentifier() : "no dates available") + "```");
    });
});
bot.command('getTodaysImages', ctx => {
    logMsg(ctx);
    dataService.getImages().then(images => {
        ctx.reply(images.getDatesSameDay(FileDate.now()));
        //    ctx.reply(datesSince.map(date => date.getIdentifier()).reduce((prev, current) => current + '\n' + prev, ''));
    });
});
bot.command('getImages', ctx => {
    logMsg(ctx);
    dataService.getImages().then(images => {
        const replyImages = images.getImageForFlight(images.getNewestDate(), ["msa", "therm"]);
        replyImages.forEach(image => {
            ctx.replyWithPhoto(image,
                {
                    caption: image
                })
        });
    });
});

function startup() {
    //wait until DB got updated before starting the bot
    console.log("updating DB.");
    dataService.loadData().then((img) => {
        console.log("updated DB.Bot starts now polling.");
        console.log({ img });
        bot.startPolling();
        setTimeout(() => reload(), 100000);
    });
}

function reload() {
    dataService.loadData().then(() => {
        setTimeout(() => reload(), 100000);
        console.log('successfully reloaded');
    }).catch(() => {
        console.log('error while loading- retrying');
        reload();
    });
}

setupMonitorCommands();
startup();