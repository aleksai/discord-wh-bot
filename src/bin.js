const request = require('request')
const base64url = require('base64-url')

const queries = require('./queries')

const zkillboard = require('./zkillboard')
const esi = require('./esi')
const web = require('./web')

var bot
var db
var config

// Message parser(handler)

function handleMessage(user, userID, channelID, message, evt) {

    // Ignore Helios own messages

    if(userID !== config.user) { 

        // ! commands

        if (message.substring(0, 1) === '!') {
            var args = message.substring(1).split(' ')
            var cmd = args[0]

            args = args.splice(1)

            switch(cmd.toLowerCase()) {
                case 'helios':
                    bot.sendMessage({ to: channelID, embed: { title: 'Hi, I\'m Helios, Pong.', color: 0xffffff } })
                break
                case 'wh':
                    search(args, channelID, evt.d.guild_id, userID)
                break
            }

            return
        }

        // Smart commands

        db.serialize(() => { db.all(queries.getWaits(userID, channelID), (err, rows) => {
            if (!err) {

                // If there are some requests waiting

                if(rows.length) {
                    const wait = rows[0]

                    switch(wait.type) {
                        case 'note':
                            db.run(queries.insertNote, wait.system, message, wait.guild_id, channelID, user, function() {
                                db.run(queries.removeWait(userID, channelID), function() {
                                    bot.sendMessage({ to: channelID, embed: { title: 'Note successfully saved.' } })
                                })
                            })
                        break
                    }
                } else {

                    // If there's no waits and Helios in private conversation, we can parse something without ! sign:

                    if(!evt.d.guild_id) {
                        switch(message.toLowerCase()) {
                            case 'addchar':
                            case 'enablechar':
                            case 'enchar':
                            case 'add':
                            case 'enable':
                            case 'en':
                                startCharEnable(channelID, userID)
                            break
                            case 'removechar':
                            case 'rmchar':
                            case 'remove':
                            case 'rm':
                            case 'disablechar':
                            case 'dischar':
                            case 'disable':
                            case 'dis':
                                startCharDisable(channelID, userID)
                            break
                            case 'mute':
                                muteAutomode(channelID, userID)
                            break
                            case 'unmute':
                                unmuteAutomode(channelID, userID)
                            break
                            default:
                                var args = message.split(' ')

                                var sysId = message.match(/\/\/([0-9]{8})">/g)
                                if(sysId && sysId.length) sysId = sysId[0].match(/[0-9]{8}/g)

                                if(sysId) {
                                    search([sysId], channelID, evt.d.guild_id, userID)
                                } else if(args.length) {
                                    search(args, channelID, evt.d.guild_id, userID)
                                }
                            break
                        }
                    }
                }
            }
        })})
    }
}

// Main search algorithm

function search(forString, channelID, guildID, userID, automode) {
    automode = automode || false

    var wh = forString.length > 0 ? forString[0].toString().toUpperCase() : ''
    var second = forString.length > 1 ? forString[1].toString().toUpperCase() : ''
    var third = forString.length > 2 ? forString[2].toString().toUpperCase() : ''

    var mode = 'NAN'
    var whid = false
    var holeunclear = false
    var effectclass = 0;

    var effectkeywords = ['BLACK', 'HOLE', 'MAGNETAR', 'MAG', 'RED', 'GIANT', 'PULSAR', 'PUL', 'PULS', 'WOLF', 'RAYET', 'RAY', 'CATACLYSMIC', 'CAT', 'VARIABLE', 'VAR']

    // Parsing a message

    if(/^[A-Z]{1}\d{3}$/.test(wh)) {
        mode = 'HOLE'
    } else if(/^\d{3}$/.test(wh)) {
        mode = 'HOLE'
        holeunclear = true
    } else if(/^[J]{1}\d{6}$/.test(wh)) {
        mode = 'SYS'
    } else if(/^\d{6}$/.test(wh)) {
        mode = 'SYS'
        wh = 'J' + wh
    } else if(/^\d{8}$/.test(wh)) {
        mode = 'SYS'
        whid = true
    } else if(effectkeywords.indexOf(wh) >= 0) {
        mode = 'EFFECT'

        if(/^C?\d{1}$/.test(second)) {
            effectclass = parseInt(second.replace('C', ''))
        }

        if(/^C?\d{1}$/.test(third)) {
            effectclass = parseInt(third.replace('C', ''))
        }
    }

    switch(mode) {

        // Effect information query

        case 'EFFECT':
            var effectID = 0;

            switch(wh) {
                case 'BLACK':
                case 'HOLE':
                    effectID = 1;
                break
                case 'MAGNETAR':
                case 'MAG':
                    effectID = 2;
                break
                case 'RED':
                case 'GIANT':
                    effectID = 3;
                break
                case 'PULSAR':
                case 'PUL':
                case 'PULS':
                    effectID = 4;
                break
                case 'WOLF':
                case 'RAYET':
                case 'RAY':
                    effectID = 5;
                break
                case 'CATACLYSMIC':
                case 'VARIABLE':
                case 'CAT':
                case 'VAR':
                    effectID = 6;
                break
            }

            db.serialize(() => { db.all(queries.getEffect(effectID), (err, rows) => {
                if (!err && rows.length > 0) {
                    var title = rows[0].hole
                    var nextClassNumber = 1;

                    function nextClass(only) {
                        if(nextClassNumber > 6) return

                        only = only || false

                        const finaltitle = title + ' **C' + nextClassNumber + '**'
                    
                        var fields = []

                        for (var i = 0; i < rows.length; i++) {
                            const effect = rows[i]

                            fields.push({ name: effect.effect, value: effect['c' + nextClassNumber], inline: true })
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
            })})
        break

        // Numbered hole information

        case 'HOLE':
            db.serialize(() => { db.all(queries.getHole(holeunclear, wh), (err, rows) => {
                if (err || rows.length === 0) {
                    bot.sendMessage({ to: channelID, message: 'Not found' })
                } else {
                    for (var i = 0; i < rows.length; i++) {
                        var hole = rows[i]

                        var fields = []
                        var title = '**' + hole.hole + '** '
                        var color = 0x000000

                        switch(hole.in_class) {
                            case 7:
                                title += '(High)'
                                color = 0x00ff00
                            break
                            case 8:
                                title += '(Low)'
                                color = 0xdfca1c
                            break
                            case 9:
                                title += '(Nullsec)'
                                color = 0xff0000
                            break
                            case 12:
                                title += '(Thera)'
                                color = 0x0000ff
                            break
                            default:
                                title += '(C' + rows[i].in_class + ')'
                                color = 0xffffff
                            break
                        }

                        fields.push({ name: 'Time', value: (hole.maxStableTime/60) + ' h', inline: true })
                        fields.push({ name: 'Mass', value: hole.maxStableMass.toLocaleString('ru') + ' kg', inline: true })
                        fields.push({ name: 'Jump Mass', value: hole.maxJumpMass.toLocaleString('ru') + ' kg', inline: true })

                        var ships = 'https://i.imgur.com/mo7GyKz.png'

                        if(hole.maxJumpMass < 20000000) {
                            ships = 'https://i.imgur.com/ANpxhrg.png'
                        } else if(hole.maxJumpMass < 300000000) {
                            ships = 'https://i.imgur.com/Y7Oh9eP.png'
                        } else if(hole.maxJumpMass < 1000000000) {
                            ships = 'https://i.imgur.com/ZNSylzj.png'
                        }

                        if(hole.massRegeneration) fields.push({ name: 'Mass regen', value: hole.massRegeneration.toLocaleString('ru') + ' kg', inline: true })

                        bot.sendMessage({ to: channelID, embed: { title: title, url: 'http://anoik.is/wormholes/' + hole.hole, color: color, fields: fields, thumbnail: { url: ships } } })
                    }
                }
            })})
        break

        // Defined system search

        case 'SYS':
            db.serialize(() => { db.all(queries.getSystem(whid, wh), (err, rows) => {
                if (err || rows.length === 0) {
                    if(!automode) bot.sendMessage({ to: channelID, message: 'Not found' })
                } else {
                    let system = rows[0]

                    // Get system statics

                    db.all(queries.getStatics(system), (err, rows) => {
                        var title = '**' + system.system + '**' + (system.system === config.home ? ' :crown: ' : '') + (system.class < 0 ? ' (shattered)' : '')
                        var fields = [
                            { name: 'Class', value: 'C' + Math.abs(system.class), inline: true },
                            { name: 'Effect', value: (system.effect ? system.effect : 'No'), inline: true },
                        ]

                        // Embed statics information

                        var embeds = []
                        var statics = ''

                        for (var i = 0; i < rows.length; i++) {
                            var embed = {}

                            var ships = 'https://i.imgur.com/mo7GyKz.png'

                            if(rows[i].maxJumpMass < 20000000) {
                                ships = 'https://i.imgur.com/ANpxhrg.png'
                            } else if(rows[i].maxJumpMass < 300000000) {
                                ships = 'https://i.imgur.com/Y7Oh9eP.png'
                            } else if(rows[i].maxJumpMass < 1000000000) {
                                ships = 'https://i.imgur.com/ZNSylzj.png'
                            }

                            switch(rows[i].in_class) {
                                case 7:
                                    embed = { title: '**' + rows[i].hole + '** (High)', color: 0x00ff00 }
                                    statics += (statics.length > 0 ? ', ' : '') + '**H** (' + rows[i].hole + ')'
                                break
                                case 8:
                                    embed = { title: '**' + rows[i].hole + '** (Low)', color: 0xdfca1c }
                                    statics += (statics.length > 0 ? ', ' : '') + '**L** (' + rows[i].hole + ')'
                                break
                                case 9:
                                    embed = { title: '**' + rows[i].hole + '** (Nullsec)', color: 0xff0000 }
                                    statics += (statics.length > 0 ? ', ' : '') + '**N** (' + rows[i].hole + ')'
                                break
                                case 12:
                                    embed = { title: '**' + rows[i].hole + '** (Thera)', color: 0x0000ff }
                                    statics += (statics.length > 0 ? ', ' : '') + '**T** (' + rows[i].hole + ')'
                                break
                                default:
                                    embed = { title: '**' + rows[i].hole + '** (C' + rows[i].in_class + ')', color: 0xffffff }
                                    statics += (statics.length > 0 ? ', ' : '') + '**C' + rows[i].in_class + '** (' + rows[i].hole + ')'
                                break
                            }

                            embed.thumbnail = { url: ships }

                            embeds.push(embed)
                        }

                        if(automode) return bot.sendMessage({ to: channelID, tts: true, message: "🛸 " + automode + " **" + system.system + ' — C' + Math.abs(system.class) + '** ' + (system.effect ? system.effect : '') + '\n🚥 ' + statics })

                        // Get notes count

                        db.all(queries.getNotesCountBySys(system.system), (err, rows) => {
                            const notes_amount = rows[0]['COUNT(*)']
                            if(notes_amount > 0) fields.push({ name: 'Notes', value: notes_amount, inline: true })

                            // Send search results

                            bot.sendMessage({ to: channelID, embed: { title: title, fields: fields, url: 'http://anoik.is/systems/' + system.system } }, function(error, response) {
                                for (var i = 0; i < embeds.length; i++) {
                                    bot.sendMessage({ to: channelID, embed: embeds[i] })
                                }

                                if(response && response.id) {

                                    // Add interactable reactions to system search

                                    bot.addReaction({ channelID: channelID, messageID: response.id, reaction: '☠️' }, function() {
                                        setTimeout(function() {
                                            bot.addReaction({ channelID: channelID, messageID: response.id, reaction: '📒' }, function() {
                                                setTimeout(function() {
                                                    bot.addReaction({ channelID: channelID, messageID: response.id, reaction: '💬' }, function() {
                                                        setTimeout(function() {
                                                            bot.addReaction({ channelID: channelID, messageID: response.id, reaction: '💥' }, function() {

                                                                // And track them

                                                                trackMessage(response.id, channelID, function(e, message) {
                                                                    if(!message.reactions) return

                                                                    for (var i = 0; i < message.reactions.length; i++) {
                                                                        const reaction = message.reactions[i]

                                                                        // Interaction: Get system effect information

                                                                        if(reaction.emoji.name === '💥' && reaction.count > 1) {
                                                                            bot.removeReaction({ channelID: channelID, messageID: response.id, reaction: '💥' })

                                                                            if(system.effect) {
                                                                                search([system.effect.split(' ')[0], system.class], channelID, guildID, userID)
                                                                            }
                                                                        }

                                                                        // Interaction: Get system notes

                                                                        if(reaction.emoji.name === '📒' && reaction.count > 1) {
                                                                            bot.removeReaction({ channelID: channelID, messageID: response.id, reaction: '📒' })

                                                                            notes(system.system, channelID, guildID, userID, system.system)
                                                                        }

                                                                        // Interaction: Make a new note in a system

                                                                        if(reaction.emoji.name === '💬' && reaction.count > 1) {
                                                                            bot.removeReaction({ channelID: channelID, messageID: response.id, reaction: '💬' })

                                                                            waitForNote(system.system, channelID, guildID, userID)
                                                                        }

                                                                        // Interaction: zKillboard

                                                                        if(reaction.emoji.name === '☠️' && reaction.count > 1) {
                                                                            bot.removeReaction({ channelID: channelID, messageID: response.id, reaction: '☠️' })

                                                                            zKillboard(system.solarsystemid, channelID)
                                                                        }
                                                                    }
                                                                })
                                                            })
                                                        }, 500)
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
            })})
        break
    }
}

// Track interactable Helios messages(by custom reactions)

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

// Interaction: Get system notes

function notes(system, channelID, guildID, userID, system) {
    db.serialize(() => { db.all(queries.getNotes(system, channelID, guildID), (err, rows) => {
        if (!err) retrieveNotes(channelID, rows, rows.length > 0, guildID, userID, system)
    })})
}

// Interaction: Make a new note

function waitForNote(system, channelID, guildID, userID) {
    db.serialize(() => { db.run(queries.insertWait, 'note', guildID, userID, channelID, system, function() {
        bot.sendMessage({ to: channelID, embed: { title: 'Text a note:' } })
    })})
}

// Interaction: zKillboard system summary

function zKillboard(solarsystemID, channelID) {
    bot.sendMessage({ to: channelID, embed: { title: 'Loading zKillboard summary...\nhttps://zkillboard.com/system/' + solarsystemID + '/' } })

    zkillboard.getSystemStats(solarsystemID, function(data) {
        const keys = Object.keys(data.months)

        const last_month = data.months[keys[keys.length - 1]]
        const top_corporations = data["topLists"][1]["values"]

        var fields = []

        for (var i = 0; i < Math.min(3, top_corporations.length); i++) {
            fields.push({ name: top_corporations[i].corporationName, value: top_corporations[i].kills })
        }

        bot.sendMessage({ to: channelID, embed: { title: "Top corporations last time", fields: fields } })

        setTimeout(function() {
            fields = []

            fields.push({ name: 'Kills count (month)', value: last_month.shipsDestroyed.toString(), inline: true })
            fields.push({ name: 'Kills in ISK (month)', value: (last_month.iskDestroyed / 1000000000).toFixed(1) + 'b', inline: true })

            bot.sendMessage({ to: channelID, embed: { fields: fields } })
        }, 500)
    })

    zkillboard.getSystemKills(solarsystemID, 86400 * 7, function(kills) {
        var fields = []

        fields.push({ name: 'Kills count (week)', value: kills.length.toString(), inline: true })
        fields.push({ name: 'Kills in ISK (week)', value: (kills.reduce(function (a, b) { return a + b.zkb.totalValue }, 0) / 1000000000).toFixed(1) + 'b', inline: true })

        bot.sendMessage({ to: channelID, embed: { fields: fields } })
    }, 1500)

    zkillboard.getSystemKills(solarsystemID, 86400, function(kills) {
        var fields = []

        fields.push({ name: 'Kills count (24 h)', value: kills.length.toString(), inline: true })
        fields.push({ name: 'Kills in ISK (24 h)', value: (kills.reduce(function (a, b) { return a + b.zkb.totalValue }, 0) / 1000000000).toFixed(1) + 'b', inline: true })

        bot.sendMessage({ to: channelID, embed: { fields: fields } })
    }, 3000)
}

// Retrieve notes to chat

function retrieveNotes(channelID, notes, alot, guildID, userID, system) {
    if(!notes.length) {
        if(!alot) {
            bot.sendMessage({ to: channelID, embed: { title: 'No notes here, maybe add a new one?' } }, function(e, response) {
                if(!response) return

                bot.addReaction({ channelID: channelID, messageID: response.id, reaction: '💬' }, function() {
                    trackMessage(response.id, channelID, function(e, message) {
                        if(!message.reactions) return

                        for (var i = 0; i < message.reactions.length; i++) {
                            const reaction = message.reactions[i]

                            if(reaction.emoji.name === '💬' && reaction.count > 1) {
                                bot.removeReaction({ channelID: channelID, messageID: response.id, reaction: '💬' })

                                waitForNote(system, channelID, guildID, userID)
                            }
                        }
                    })
                })
            })
        }

        return
    }

    const next = notes[0]

    bot.sendMessage({ to: channelID, embed: { title: next.author, description: next.comment } }, function() {
        notes.shift()

        retrieveNotes(channelID, notes, alot, guildID, userID, system)
    })
}

// ESI Auth

function startCharEnable(channelID, userID) {
    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)

    db.serialize(() => { db.run(queries.insertCharEnableDisable, userID, channelID, token, "", function() {
        bot.sendMessage({ to: channelID, embed: { title: 'Link to enable a new character: ' + config.site + '/enable/' + userID + '/' + channelID + '/' + token } })
    })})
}

function startCharDisable(channelID, userID) {
    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)

    db.serialize(() => { db.run(queries.insertCharEnableDisable, userID, channelID, token, "", function() {
        bot.sendMessage({ to: channelID, embed: { title: 'Link to disable one of characters: ' + config.site + '/disable/' + userID + '/' + channelID + '/' + token } })
    })})
}

function enableChar(req, res) {
    db.serialize(() => { db.all(queries.getCharEnableDisable(req.params.userId, req.params.channelId, req.params.token), (err, rows) => {
        if(!rows.length) return res.redirect('/')
        
        web.send(res, '<h1>Enable new character:</h1>Click this button to be redirected to EVE ESI authorization page:<br><br><a href="https://login.eveonline.com/v2/oauth/authorize/?response_type=code&redirect_uri=' + config.site + '%2Fcallback&client_id=' + config.esi_client_id + '&scope=' + config.esi_scope.join("%20") + '&state=' + req.params.token + '">Login your EVE Character</a>')
    })})
}

function callbackChar(req, res) {
    const code = req.query.code
    const token = req.query.state

    function success(channel_id, character_name) {
        web.send(res, "<h1>Success, you can close this window.</h1>If you seeing this message your character is enabled.")

        bot.sendMessage({ to: channel_id, embed: { title: 'Character enabled: ' + character_name } })
    }

    db.serialize(() => { db.all(queries.getCharEnableDisableByToken(token), (err, rows) => {
        if(!rows.length) return res.redirect('/')

        const enDis = rows[0]

        esi.exchangeCode(code, config, function(body) {
            if(!body) return web.send(res.status(403), "<h1>Failure, try later</h1>Something went wrong for now, try one more time a bit later please.")

            db.serialize(() => { db.all(queries.getCharEsiAuth(enDis.user_id, enDis.channel_id, body.character_id), (err, rows) => {
                db.run(queries.removeCharEnableDisableByToken(token), function() {
                    if(rows.length) {
                        db.run(queries.updateCharEsiAuth(), body.access_token, body.refresh_token, body.scope.join(","), enDis.id, function() {
                            success(enDis.channel_id, body.character_name)
                        })
                    } else {
                        db.run(queries.insertCharEsiAuth(), enDis.user_id, enDis.channel_id, body.character_id, body.character_name, body.access_token, body.refresh_token, body.scope.join(","), function() {
                            success(enDis.channel_id, body.character_name)
                        })
                    }
                })
            })})
        })
    })})
}

function disableChar(req, res) {
    db.serialize(() => { db.all(queries.getCharEnableDisable(req.params.userId, req.params.channelId, req.params.token), (err, rows) => {
        if(rows.length) {
            db.all(queries.getCharEsiAuths(req.params.userId, req.params.channelId), (err, rows) => {
                if(rows.length) {
                    var html = "<h1>Choose a character to disable:</h1>"

                    for (var i = 0; i < rows.length; i++) {
                        html += '<br><a href="' + req.params.token + '/' + rows[i].id + '">' + rows[i].character_name + '</a>'
                    }

                    web.send(res, html)
                } else {
                    web.send(res, "<h1>No enabled characters found</h1> You can add one by typing <b>enable</b> to bot in private conversation.")
                }
            })

            return
        }

        res.redirect('/')
    })})
}

function disableCharFinish(req, res) {
    db.serialize(() => { db.all(queries.getCharEnableDisable(req.params.userId, req.params.channelId, req.params.token), (err, rows) => {
        if(!rows.length) return res.redirect('/')

        db.all(queries.getCharEsiAuthById(req.params.userId, req.params.channelId, req.params.characterId), (err, rows) => {
            if(!rows.length) return res.redirect('/')

            db.run(queries.removeCharEnableDisableByToken(req.params.token), function() {
                db.run(queries.removeCharEsiAuthById(req.params.userId, req.params.channelId, req.params.characterId), function () {
                    web.send(res, "<h1>Success, you can close this window.</h1>If you seeing this message your character is disabled.")

                    bot.sendMessage({ to: req.params.channelId, embed: { title: 'Character disabled: ' + rows[0].character_name } })
                })
            })
        })        
    })})
}

// Mute

function muteAutomode(channelID, userID) {
    db.serialize(() => {
        db.run(queries.updateCharEsiAuths, 1, userID, channelID, function() {
            bot.sendMessage({ to: channelID, embed: { title: 'Automode is now muted' } })
        })
    })
}

function unmuteAutomode(channelID, userID) {
    db.serialize(() => {
        db.run(queries.updateCharEsiAuths, 0, userID, channelID, function() {
            bot.sendMessage({ to: channelID, embed: { title: 'Automode is not muted right now' } })
        })
    })
}

// Module export

module.exports = function(_bot, _db, _config) {
    bot = _bot
    db = _db
    config = _config

    return {
        handleMessage: handleMessage,

        search: search,

        enableChar: enableChar,
        disableChar: disableChar,
        disableCharFinish: disableCharFinish,
        callbackChar: callbackChar
    }
}