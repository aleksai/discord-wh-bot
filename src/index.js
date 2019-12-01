const Discord = require('discord.io')
const sqlite3 = require('sqlite3').verbose()

const config = require('./config.json')

// DB

const db = new sqlite3.Database('./wh.db', (err) => {
    if (err) {
        console.error(err.message)
    } else {
        console.log('Connected to WH database.')
    }
})

// Discord

const bot = new Discord.Client({
   token: config.token,
   autorun: true
})

// On bot ready

bot.on('ready', function (evt) {
    console.log('Connected to Discord.')

    bot.setPresence({ game: { name: 'EVE Online' }})
})

// Execution

const bin = require('./bin')(bot, db, config)

bot.on('message', bin.handleMessage)