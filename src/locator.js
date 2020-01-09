const esi = require("./esi")
const queries = require("./queries")

const locator_debug = true
const page = 100
const loop_interval = 5
const offline_skip = 2

var loop_index = 0
var iterating_offset = 0
var iterating_chars = []
var theresmore = true

var bot
var db
var config
var search

function checkChar(char) {
	if(char.mute) return iterate()

	db.serialize(() => { db.all(queries.getCharLocation, char.id, (err, rows) => {
		const current_location = rows[0]

		if(locator_debug) console.log(char.character_name)

		if(current_location && !current_location.online && (current_location.logged_off + offline_skip * 60 * 1000 > Date.now())) {
			if(locator_debug) console.log("Logged off less than " + offline_skip + " minutes, skip...")

			return iterate()
		}

		esi.get(char.character_id, char.access_token, 'online', function(online) {
			if(!online) {
				return setTimeout(function() {
					checkChar(char)
				}, 1000)
			}

			online = JSON.parse(online)

			if(locator_debug) console.log(online)

			if(online.error && online.error === "token is expired") {
				if(locator_debug) console.log(char.character_name, "refreshing...")

				return esi.refreshToken(char.refresh_token, config, function(body) {
					if(!body) return

		            db.serialize(() => { db.run(queries.updateCharEsiAuth(), body.access_token, body.refresh_token, body.scope.join(","), char.id, function() {
	                    if(locator_debug) console.log(char.character_name, "refreshed")

	                    char.access_token = body.access_token

	                    checkChar(char)
	                })})
				})
			}

			if(online.online) {
				esi.get(char.character_id, char.access_token, 'location', function(location) {
					location = JSON.parse(location)

					if(locator_debug) console.log(location)

					updateCharLocation(char.id, current_location ? true : false, location.solar_system_id, function() {
						const new_location = location.solar_system_id.toString()

						if(!current_location || current_location.location !== new_location) {
							search([new_location], char.channel_id, null, char.user_id, char.character_name)
						}

						iterate()
					})
				})
			} else {
				updateCharLocation(char.id, current_location ? true : false, false, iterate)
			}
		})
    })})
}

function updateCharLocation(id, update, solar_system_id, callback) {
	if(!solar_system_id) {
		db.serialize(() => { db.run(update ? queries.updateCharOffline(id) : queries.insertCharOffline(id), function(err) {
	        callback()
	    })})
	} else {
		db.serialize(() => { db.run(update ? queries.updateCharLocation(id) : queries.insertCharLocation(id), solar_system_id, function(err) {
	        callback()
	    })})
	}
}

function iterate() {
	if(iterating_chars.length === 0) {
		if(locator_debug) console.log("")
		
		if(theresmore) {
			if(locator_debug) console.log("There's more, so next page: " + parseInt(iterating_offset/page + 2))

			iterating_offset += page

			nextPage()
		} else {
			loop_index++

			iterating_offset = 0
			iterating_chars = []

			if(locator_debug) console.log(loop_interval + " sec rest, and repeat")

			setTimeout(loop, loop_interval * 1000)
		}

		return
	}

	if(locator_debug) console.log("")

	checkChar(iterating_chars.shift())
}

function nextPage() {
	db.serialize(() => { db.all(queries.getAllCharEsiAuths(page, iterating_offset), (err, rows) => {
        iterating_chars = rows

        theresmore = rows.length === page

        iterate()
    })})
}

function loop() {
	if(loop_index === 0) {
		loop_index++

		return setTimeout(loop, 5000)
	}

	if(locator_debug) console.log("")
	if(locator_debug) console.log("Loop #" + loop_index)

	nextPage()
}

module.exports = function(_bot, _db, _config, _search) {
    bot = _bot
    db = _db
    config = _config
    search = _search

    return {
		loop: loop
	}
}