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
                search(args, channelID);
            break;
         }
    } else if(userID !== "612975282936086543") {
        var args = message.split(' ');

        search(args, channelID);
    }
});

function search(args, channelID) {
    if(args.length) {
        var wh = args[0].toString().toUpperCase();
        var mode = "NAN";
        var holeunclear = false;

        console.log(wh);

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
                db.serialize(() => {
                  db.all('SELECT hole, in_class, maxJumpMass, maxStableTime, maxStableMass, massRegeneration FROM holes WHERE ' + (holeunclear ? ('hole LIKE "%' + wh + '"') : ('hole = "' + wh + '"')), (err, rows) => {
                    if (err || rows.length === 0) {
                        bot.sendMessage({ to: channelID, message: 'Не найдено' });
                    } else {
                        for (var i = 0; i < rows.length; i++) {
                            var hole = rows[i];

                            var message = "Дыра " + hole.hole + "\n\nКласс: ";

                            switch(hole.in_class) {
                                case 7:
                                    message += "H";
                                break;
                                case 8:
                                    message += "L";
                                break;
                                case 9:
                                    message += "N";
                                break;
                                case 12:
                                    message += "Thera";
                                break;
                                default:
                                    message += "C" + hole.in_class;
                                break;
                            }

                            message += "\nВремя: " + (hole.maxStableTime/60) + " ч";
                            message += "\nМасса: " + hole.maxStableMass.toLocaleString('ru') + " кг";
                            message += "\nМасса для прыжка: " + hole.maxJumpMass.toLocaleString('ru') + " кг";

                            if(hole.maxJumpMass < 20000000) {
                                message += ", Фригатка";
                            } else if(hole.maxJumpMass < 300000000) {
                                message += ", БК";
                            } else if(hole.maxJumpMass < 1000000000) {
                                message += ", БШ";
                            } else {
                                message += ", Капитальная";
                            }

                            if(hole.massRegeneration) message += "\nРеген массы: " + hole.massRegeneration.toLocaleString('ru') + " кг";

                            bot.sendMessage({ to: channelID, message: message });
                        }
                    }
                  });
                });
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

                        db.all('SELECT hole, in_class, maxJumpMass FROM holes WHERE ' + statics_query, (err, rows) => {
                            var statics = "";

                            for (var i = 0; i < rows.length; i++) {
                                statics += (statics.length > 0 ? ', ' : '');

                                switch(rows[i].in_class) {
                                    case 7:
                                        statics += rows[i].hole + "(H";
                                    break;
                                    case 8:
                                        statics += rows[i].hole + "(L";
                                    break;
                                    case 9:
                                        statics += rows[i].hole + "(N";
                                    break;
                                    case 12:
                                        statics += rows[i].hole + "(Thera";
                                    break;
                                    default:
                                        statics += rows[i].hole + "(C" + rows[i].in_class;
                                    break;
                                }

                                if(rows[i].maxJumpMass < 20000000) {
                                    statics += ", Фригатка";
                                } else if(rows[i].maxJumpMass < 300000000) {
                                    message += ", БК";
                                }

                                statics += ")";
                            }

                            bot.sendMessage({ to: channelID, message: "Система " + wh + "\n\nКласс: C" + system.class + "\nЭффект: " + (system.effect ? system.effect : "Нет") + "\nСтатики: " + statics });
                        });
                    }
                  });
                });
            break;
        }
    } else {
        bot.sendMessage({ to: channelID, message: 'Введите систему или дыру для поиска' });
    }
}