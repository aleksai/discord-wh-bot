const Discord = require('discord.io')
const express = require('express')
const sqlite3 = require('sqlite3').verbose()

const config = require('./config.json')

const http = express()

// DB

const db = new sqlite3.Database('./wh.db', (err) => {
    if (err) {
        console.error(err.message)
    } else {
        console.log('Connected to database.')
    }
})

// Discord

const bot = new Discord.Client({
   token: config.token,
   autorun: true
})

const bin = require('./bin')(bot, db, config)

// On bot ready

bot.on('ready', function (evt) {
    console.log('Connected to Discord.')

    bot.setPresence({ game: { name: 'EVE Online' }})
})

// Execution

bot.on('message', bin.handleMessage)

// HTTP

const web = require('./web')

http.use(express.static('public'))
http.listen(8884, () => console.log(`Connected to HTTP on 8884.`))

web.routes(http, bin)

// ESI Location Tracker

require('./locator')(bot, db, config, bin.search).loop()