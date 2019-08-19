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
                bot.sendMessage({ to: channelID, embed: { title: "Pong", color: 0xffffff } });
            break;
            case 'wh':
                search(args, channelID);
            break;
         }
    } else if(userID !== auth.user) {
        var args = message.split(' ');

        var sysId = message.match(/\/\/([0-9]{8})">/g);
        if(sysId && sysId.length) sysId = sysId[0].match(/[0-9]{8}/g);

        if(sysId) {
            search(sysId, channelID);
        } else if(args.length) {
            search(args[0], channelID);
        }
    }
});

function search(forString, channelID) {
    var wh = forString.toString().toUpperCase();
    var mode = "NAN";
    var whid = false;
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
    } else if(/^\d{8}$/.test(wh)) {
        mode = "SYS";
        whid = true;
    }

    switch(mode) {
        case "HOLE":
            db.serialize(() => {
              db.all('SELECT hole, in_class, maxJumpMass, maxStableTime, maxStableMass, massRegeneration FROM holes WHERE ' + (holeunclear ? ('hole LIKE "%' + wh + '"') : ('hole = "' + wh + '"')), (err, rows) => {
                if (err || rows.length === 0) {
                    bot.sendMessage({ to: channelID, message: 'Not found' });
                } else {
                    for (var i = 0; i < rows.length; i++) {
                        var hole = rows[i];

                        var message = "";
                        var title = "Hole **" + hole.hole + "** ";
                        var color = 0x000000;

                        switch(hole.in_class) {
                            case 7:
                                title += "High";
                                color = 0x00ff00;
                            break;
                            case 8:
                                title += "Low";
                                color = 0xdfca1c;
                            break;
                            case 9:
                                title += "Nullsec";
                                color = 0xff0000;
                            break;
                            case 12:
                                title += "Thera";
                                color = 0x0000ff;
                            break;
                            default:
                                title += "C" + rows[i].in_class;
                                color = 0xffffff;
                            break;
                        }

                        message += "\n\nTime: **" + (hole.maxStableTime/60) + " h**";
                        message += "\nMass: **" + hole.maxStableMass.toLocaleString('ru') + " kg**";
                        message += "\nJump Mass: **" + hole.maxJumpMass.toLocaleString('ru') + " kg";

                        if(hole.maxJumpMass < 20000000) {
                            message += ", Frigate-Destroyer Max";
                        } else if(hole.maxJumpMass < 300000000) {
                            message += ", Battlecruiser Max";
                        } else if(hole.maxJumpMass < 1000000000) {
                            message += ", Battleship Max";
                        } else {
                            message += ", Capital hole";
                        }

                        message += "**";

                        if(hole.massRegeneration) message += "\nMass regen: **" + hole.massRegeneration.toLocaleString('ru') + " kg**";

                        bot.sendMessage({ to: channelID, embed: { title: title, color: color, description: message } });
                    }
                }
              });
            });
        break;
        case "SYS":
            db.serialize(() => {
              db.all('SELECT system, class, effect, statics FROM wormholes WHERE ' + (whid ? 'solarsystemid = "' + wh + '"' : 'system = "' + wh + '"'), (err, rows) => {
                if (err || rows.length === 0) {
                    bot.sendMessage({ to: channelID, message: 'Not found' });
                } else {
                    var system = rows[0];
                    var statics = system.statics.split(",");

                    var statics_query = '';

                    for (var i = 0; i < statics.length; i++) {
                        statics_query += (statics_query.length > 0 ? ' OR ' : '') + 'hole = "' + statics[i] + '"';
                    }

                    db.all('SELECT hole, in_class, maxJumpMass FROM holes WHERE ' + statics_query, (err, rows) => {
                        var message = "Class: **C" + system.class + "**\nEffect: **" + (system.effect ? system.effect : "No") + "**\n\n";
                        var title ="System " + (system.system === "J225128" ? ":crown: " : "") + "**" + system.system + "**";

                        var embeds = [];

                        for (var i = 0; i < rows.length; i++) {
                            var size = null;

                            if(rows[i].maxJumpMass < 20000000) {
                                size = "Frigate-Destroyer Max";
                            } else if(rows[i].maxJumpMass < 300000000) {
                                size = "Battlecruiser Max";
                            }

                            switch(rows[i].in_class) {
                                case 7:
                                    embeds.push({ title: "Static **" + rows[i].hole + "** High", color: 0x00ff00, description: size });
                                break;
                                case 8:
                                    embeds.push({ title: "Static **" + rows[i].hole + "** Low", color: 0xdfca1c, description: size });
                                break;
                                case 9:
                                    embeds.push({ title: "Static **" + rows[i].hole + "** Nullsec", color: 0xff0000, description: size });
                                break;
                                case 12:
                                    embeds.push({ title: "Static **" + rows[i].hole + "** Thera", color: 0x0000ff, description: size });
                                break;
                                default:
                                    embeds.push({ title: "Static **" + rows[i].hole + "** C" + rows[i].in_class, color: 0xffffff, description: size });
                                break;
                            }
                        }

                        bot.sendMessage({ to: channelID, embed: { title: title, description: message } });

                        setTimeout(function(){
                           for (var i = 0; i < embeds.length; i++) {
                                bot.sendMessage({ to: channelID, embed: embeds[i] });
                            } 
                        }, 500);
                    });
                }
              });
            });
        break;
    }
}