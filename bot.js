const Discord = require('discord.io')
const sqlite3 = require('sqlite3').verbose()

const auth = require('./auth.json')

const db = new sqlite3.Database('./wh.db', (err) => {
    if (err) {
        console.error(err.message)
    } else {
        console.log('Connected to the WH database.')
    }
})

const bot = new Discord.Client({
   token: auth.token,
   autorun: true
})

bot.on('ready', function (evt) {
    console.log('Connected to Discord.')

    bot.setPresence({ game: { name: "EVE Online" }})
})

bot.on('message', function (user, userID, channelID, message, evt) {
    if(userID !== auth.user) {
        if (message.substring(0, 1) == '!') {
            var args = message.substring(1).split(' ')
            var cmd = args[0]

            args = args.splice(1)
            switch(cmd) {
                case 'whping':
                    bot.sendMessage({ to: channelID, embed: { title: "Hi I'm Helios, Pong.", color: 0xffffff } })
                break
                case 'wh':
                    search(args, channelID, evt.d.guild_id, userID)
                break
             }
        } else {
            db.serialize(() => {
                db.all('SELECT type, system, guild_id FROM waits WHERE user_id = "' + userID + '" AND channel_id = "' + channelID + '"', (err, rows) => {
                    if (!err) {
                        if(rows.length) {
                            const wait = rows[0]

                            switch(wait.type) {
                                case "comment":
                                    db.run("INSERT INTO comments VALUES (?, ?, ?, ?, ?)", wait.system, message, wait.guild_id, channelID, user, function() {
                                        db.run('DELETE FROM waits WHERE user_id = "' + userID + '" AND channel_id = "' + channelID + '"', function() {
                                            bot.sendMessage({ to: channelID, embed: { title: "Comment saved!" } })
                                        })
                                    })
                                break
                            }
                        } else {
                            if(!evt.d.guild_id) {
                                var args = message.split(' ')

                                var sysId = message.match(/\/\/([0-9]{8})">/g)
                                if(sysId && sysId.length) sysId = sysId[0].match(/[0-9]{8}/g)

                                if(sysId) {
                                    search([sysId], channelID, evt.d.guild_id, userID)
                                } else if(args.length) {
                                    search(args, channelID, evt.d.guild_id, userID)
                                }
                            }
                        }
                    }
                })
            })
        }
    }
})

var tracks = {}

function trackMessage(id, channelID, callback) {
    if(!tracks[id]) tracks[id] = 1
    else tracks[id]++

    bot.getMessage({ channelID: channelID, messageID: id }, callback)

    if(tracks[id] >= 20) return

    setTimeout(function() {
        trackMessage(id, channelID, callback)
    }, 1500)
}

function comments(system, channelID, guildID, userID, system) {
    var query = 'SELECT author, comment FROM comments WHERE system = "' + system + '"'

    if(guildID) {
        query += ' AND guild_id = "' + guildID + '"'
    } else {
        query += ' AND channel_id = "' + channelID + '"'
    }

    db.serialize(() => {
        db.all(query, (err, rows) => {
            if (!err) sendComments(channelID, rows, rows.length > 0, guildID, userID, system)
        })
    })
}

function sendComments(channelID, comments, alot, guildID, userID, system) {
    if(!comments.length) {
        if(!alot) {
            bot.sendMessage({ to: channelID, embed: { title: "No comments here, add a new one?" } }, function(e, response) {
                if(!response) return

                bot.addReaction({ channelID: channelID, messageID: response.id, reaction: "💬" }, function() {
                    trackMessage(response.id, channelID, function(e, message) {
                        if(!message.reactions) return

                        for (var i = 0; i < message.reactions.length; i++) {
                            const reaction = message.reactions[i]

                            if(reaction.emoji.name === "💬" && reaction.count > 1) {
                                bot.removeReaction({ channelID: channelID, messageID: response.id, reaction: "💬" })

                                waitForComment(system, channelID, guildID, userID)
                            }
                        }
                    })
                })
            })
        }

        return
    }

    const next = comments[0]

    bot.sendMessage({ to: channelID, embed: { title: next.author, description: next.comment } }, function() {
        comments.shift()
        sendComments(channelID, comments, alot, guildID, userID, system)
    })
}

function waitForComment(system, channelID, guildID, userID) {
    db.serialize(() => {
        db.run("INSERT INTO waits VALUES (?, ?, ?, ?, ?)", 'comment', guildID, userID, channelID, system, function() {
            bot.sendMessage({ to: channelID, embed: { title: "Write your comment in chat..." } })
        })
    })
}

function search(forString, channelID, guildID, userID) {
    var wh = forString.length > 0 ? forString[0].toString().toUpperCase() : ""
    var second = forString.length > 1 ? forString[1].toString().toUpperCase() : ""
    var third = forString.length > 2 ? forString[2].toString().toUpperCase() : ""

    var mode = "NAN"
    var whid = false
    var holeunclear = false
    var effectclass = 0;

    var effectkeywords = ["BLACK", "HOLE", "MAGNETAR", "MAG", "RED", "GIANT", "PULSAR", "PUL", "PULS", "WOLF", "RAYET", "RAY", "CATACLYSMIC", "CAT", "VARIABLE", "VAR"]

    if(/^[A-Z]{1}\d{3}$/.test(wh)) {
        mode = "HOLE"
    } else if(/^\d{3}$/.test(wh)) {
        mode = "HOLE"
        holeunclear = true
    } else if(/^[J]{1}\d{6}$/.test(wh)) {
        mode = "SYS"
    } else if(/^\d{6}$/.test(wh)) {
        mode = "SYS"
        wh = "J" + wh
    } else if(/^\d{8}$/.test(wh)) {
        mode = "SYS"
        whid = true
    } else if(effectkeywords.indexOf(wh) >= 0) {
        mode = "EFFECT"

        if(/^C?\d{1}$/.test(second)) {
            effectclass = parseInt(second.replace('C', ''))
        }

        if(/^C?\d{1}$/.test(third)) {
            effectclass = parseInt(third.replace('C', ''))
        }
    }

    switch(mode) {
        case "EFFECT":
            var effectId = 0;

            switch(wh) {
                case "BLACK":
                case "HOLE":
                    effectId = 1;
                break
                case "MAGNETAR":
                case "MAG":
                    effectId = 2;
                break
                case "RED":
                case "GIANT":
                    effectId = 3;
                break
                case "PULSAR":
                case "PUL":
                case "PULS":
                    effectId = 4;
                break
                case "WOLF":
                case "RAYET":
                case "RAY":
                    effectId = 5;
                break
                case "CATACLYSMIC":
                case "VARIABLE":
                case "CAT":
                case "VAR":
                    effectId = 6;
                break
            }

            db.serialize(() => {
                db.all('SELECT hole, effect, c1, c2, c3, c4, c5, c6 FROM effects WHERE id_type = ' + effectId, (err, rows) => {
                    if (!err && rows.length > 0) {
                        var title = rows[0].hole
                        var nextClassNumber = 1;

                        function nextClass(only) {
                            if(nextClassNumber > 6) return

                            only = only || false

                            const finaltitle = title + " **C" + nextClassNumber + "**"
                        
                            var fields = []

                            for (var i = 0; i < rows.length; i++) {
                                const effect = rows[i]

                                fields.push({ name: effect.effect, value: effect["c" + nextClassNumber], inline: true })
                            }

                            nextClassNumber++

                            setTimeout(function() {
                                bot.sendMessage({ to: channelID, embed: { title: finaltitle, fields: fields } }, (only ? function(){} : nextClass))
                            }, 600)
                        }

                        if(effectclass) {
                            nextClassNumber = effectclass
                            
                            nextClass(true)
                        } else {
                            nextClass()
                        }
                    }
                })
            })
        break
        case "HOLE":
            db.serialize(() => {
                db.all('SELECT hole, in_class, maxJumpMass, maxStableTime, maxStableMass, massRegeneration FROM holes WHERE ' + (holeunclear ? ('hole LIKE "%' + wh + '"') : ('hole = "' + wh + '"')), (err, rows) => {
                    if (err || rows.length === 0) {
                        bot.sendMessage({ to: channelID, message: 'Not found' })
                    } else {
                        for (var i = 0; i < rows.length; i++) {
                            var hole = rows[i]

                            var fields = []
                            var title = "**" + hole.hole + "** "
                            var color = 0x000000

                            switch(hole.in_class) {
                                case 7:
                                    title += "(High)"
                                    color = 0x00ff00
                                break
                                case 8:
                                    title += "(Low)"
                                    color = 0xdfca1c
                                break
                                case 9:
                                    title += "(Nullsec)"
                                    color = 0xff0000
                                break
                                case 12:
                                    title += "(Thera)"
                                    color = 0x0000ff
                                break
                                default:
                                    title += "(C" + rows[i].in_class + ")"
                                    color = 0xffffff
                                break
                            }

                            fields.push({ name: "Time", value: (hole.maxStableTime/60) + " h", inline: true })
                            fields.push({ name: "Mass", value: hole.maxStableMass.toLocaleString('ru') + " kg", inline: true })
                            fields.push({ name: "Jump Mass", value: hole.maxJumpMass.toLocaleString('ru') + " kg", inline: true })

                            var ships = "https://i.imgur.com/mo7GyKz.png"

                            if(hole.maxJumpMass < 20000000) {
                                ships = "https://i.imgur.com/ANpxhrg.png"
                            } else if(hole.maxJumpMass < 300000000) {
                                ships = "https://i.imgur.com/Y7Oh9eP.png"
                            } else if(hole.maxJumpMass < 1000000000) {
                                ships = "https://i.imgur.com/ZNSylzj.png"
                            }

                            if(hole.massRegeneration) fields.push({ name: "Mass regen", value: hole.massRegeneration.toLocaleString('ru') + " kg", inline: true })

                            bot.sendMessage({ to: channelID, embed: { title: title, url: "http://anoik.is/wormholes/" + hole.hole, color: color, fields: fields, thumbnail: { url: ships } } })
                        }
                    }
                })
            })
        break
        case "SYS":
            db.serialize(() => {
                db.all('SELECT system, class, effect, statics FROM wormholes WHERE ' + (whid ? 'solarsystemid = "' + wh + '"' : 'system = "' + wh + '"'), (err, rows) => {
                    if (err || rows.length === 0) {
                        bot.sendMessage({ to: channelID, message: 'Not found' })
                    } else {
                        var system = rows[0]
                        var statics = system.statics.split(",")

                        var statics_query = ''

                        for (var i = 0; i < statics.length; i++) {
                            statics_query += (statics_query.length > 0 ? ' OR ' : '') + 'hole = "' + statics[i] + '"'
                        }

                        db.all('SELECT hole, in_class, maxJumpMass FROM holes WHERE ' + statics_query, (err, rows) => {
                            var title = "**" + system.system + "**" + (system.system === "J225128" ? " :crown: " : "") + (system.class < 0 ? " (shattered)" : "")
                            var fields = [
                                { name: "Class", value: "C" + Math.abs(system.class), inline: true },
                                { name: "Effect", value: (system.effect ? system.effect : "No"), inline: true },
                            ]

                            var embeds = []

                            for (var i = 0; i < rows.length; i++) {
                                var embed = {}

                                var ships = "https://i.imgur.com/mo7GyKz.png"

                                if(rows[i].maxJumpMass < 20000000) {
                                    ships = "https://i.imgur.com/ANpxhrg.png"
                                } else if(rows[i].maxJumpMass < 300000000) {
                                    ships = "https://i.imgur.com/Y7Oh9eP.png"
                                } else if(rows[i].maxJumpMass < 1000000000) {
                                    ships = "https://i.imgur.com/ZNSylzj.png"
                                }

                                switch(rows[i].in_class) {
                                    case 7:
                                        embed = { title: "**" + rows[i].hole + "** (High)", color: 0x00ff00 }
                                    break
                                    case 8:
                                        embed = { title: "**" + rows[i].hole + "** (Low)", color: 0xdfca1c }
                                    break
                                    case 9:
                                        embed = { title: "**" + rows[i].hole + "** (Nullsec)", color: 0xff0000 }
                                    break
                                    case 12:
                                        embed = { title: "**" + rows[i].hole + "** (Thera)", color: 0x0000ff }
                                    break
                                    default:
                                        embed = { title: "**" + rows[i].hole + "** (C" + rows[i].in_class + ")", color: 0xffffff }
                                    break
                                }

                                embed.thumbnail = { url: ships }

                                embeds.push(embed)
                            }

                            db.all('SELECT COUNT(*) FROM comments WHERE system = \'' + system.system + '\'', (err, rows) => {
                                const comments_amount = rows[0]["COUNT(*)"]
                                if(comments_amount > 0) fields.push({ name: "Comments", value: comments_amount, inline: true })

                                bot.sendMessage({ to: channelID, embed: { title: title, fields: fields, url: "http://anoik.is/systems/" + system.system } }, function(error, response) {
                                    for (var i = 0; i < embeds.length; i++) {
                                        bot.sendMessage({ to: channelID, embed: embeds[i] })
                                    }

                                    if(response && response.id) {
                                        bot.addReaction({ channelID: channelID, messageID: response.id, reaction: "💥" }, function() {
                                            setTimeout(function() {
                                                bot.addReaction({ channelID: channelID, messageID: response.id, reaction: "📒" }, function() {
                                                    setTimeout(function() {
                                                        bot.addReaction({ channelID: channelID, messageID: response.id, reaction: "💬" }, function() {
                                                            trackMessage(response.id, channelID, function(e, message) {
                                                                if(!message.reactions) return

                                                                for (var i = 0; i < message.reactions.length; i++) {
                                                                    const reaction = message.reactions[i]

                                                                    if(reaction.emoji.name === "💥" && reaction.count > 1) {
                                                                        bot.removeReaction({ channelID: channelID, messageID: response.id, reaction: "💥" })

                                                                        if(system.effect) {
                                                                            search([system.effect.split(" ")[0], system.class], channelID, guildID, userID)
                                                                        }
                                                                    }

                                                                    if(reaction.emoji.name === "📒" && reaction.count > 1) {
                                                                        bot.removeReaction({ channelID: channelID, messageID: response.id, reaction: "📒" })

                                                                        comments(system.system, channelID, guildID, userID, system.system)
                                                                    }

                                                                    if(reaction.emoji.name === "💬" && reaction.count > 1) {
                                                                        bot.removeReaction({ channelID: channelID, messageID: response.id, reaction: "💬" })

                                                                        waitForComment(system.system, channelID, guildID, userID)
                                                                    }
                                                                }
                                                            })
                                                        })
                                                    }, 500)
                                                })
                                            }, 500)
                                        })
                                    }
                                })
                            })
                        })
                    }
                })
            })
        break
    }
}