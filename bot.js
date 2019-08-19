var Discord = require('discord.io');
var sqlite3 = require('sqlite3').verbose();
var auth = require('./auth.json');

let db = new sqlite3.Database('./wh.db', (err) => {
    if (err) {
        console.error(err.message);
    } else {
        console.log('Connected to the WH database.');
    }
});

var bot = new Discord.Client({
   token: auth.token,
   autorun: true
});

bot.on('ready', function (evt) {
    console.log('Connected to Discord.');
});

bot.on('message', function (user, userID, channelID, message, evt) {
    if (message.substring(0, 1) == '!') {
        var args = message.substring(1).split(' ');
        var cmd = args[0];
       
        args = args.splice(1);
        switch(cmd) {
            case 'ping':
                bot.sendMessage({ to: channelID, message: 'Pong!' });
            break;
            case 'wh':
                if(args.length) {
                    var wh = args[0].toString().toUpperCase();
                    var mode = "NAN";
                    var holeunclear = false;

                    if(/^[A-Z]{1}\d{3}$/.test(wh)) {
                        mode = "HOLE";
                    } else if(/^\d{3}$/.test(wh)) {
                        mode = "HOLE";
                        holeunclear = true;
                    } else if(/^[J]{1}\d{6}$/.test(wh)) {
                        mode = "SYS";
                    } else if(/^\d{6}$/.test(wh)) {
                        mode = "SYS";
                        wh = "J" + wh;
                    }

                    switch(mode) {
                        case "HOLE":
                            bot.sendMessage({ to: channelID, message: 'Запрос ясен, но пока не готово' });
                        break;
                        case "SYS":
                            db.serialize(() => {
                              db.all('SELECT class, effect, statics FROM wormholes WHERE system = "' + wh + '"', (err, rows) => {
                                if (err || rows.length === 0) {
                                    bot.sendMessage({ to: channelID, message: 'Не найдено' });
                                } else {
                                    var system = rows[0];
                                    var statics = system.statics.split(",");

                                    var statics_query = '';

                                    for (var i = 0; i < statics.length; i++) {
                                        statics_query += (statics_query.length > 0 ? ' OR ' : '') + 'hole = "' + statics[i] + '"';
                                    }

                                    db.all('SELECT hole, in_class FROM holes WHERE ' + statics_query, (err, rows) => {
                                        var statics = "";

                                        for (var i = 0; i < rows.length; i++) {
                                            switch(rows[i].in_class) {
                                                case 7:
                                                    statics += (statics.length > 0 ? ', ' : '') + rows[i].hole + "(H)";
                                                break;
                                                case 8:
                                                    statics += (statics.length > 0 ? ', ' : '') + rows[i].hole + "(L)";
                                                break;
                                                case 9:
                                                    statics += (statics.length > 0 ? ', ' : '') + rows[i].hole + "(N)";
                                                break;
                                                default:
                                                    statics += (statics.length > 0 ? ', ' : '') + rows[i].hole + "(" + rows[i].in_class + ")";
                                                break;
                                            }
                                        }

                                        bot.sendMessage({ to: channelID, message: "Система " + wh + "\n\nКласс: C" + system.class + "\nЭффект: " + (system.effect ? system.effect : "Нет") + "\nСтатики: " + statics });
                                    });
                                }
                              });
                            });
                        break;
                        default:
                            bot.sendMessage({ to: channelID, message: 'Нипанятна' });
                        break;
                    }
                    
                } else {
                    bot.sendMessage({ to: channelID, message: 'Введите систему или дыру для поиска' });
                }
            break;
         }
     }
});