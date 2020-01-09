module.exports = {

	insertWait: 'INSERT INTO waits VALUES (?, ?, ?, ?, ?)',
	insertNote: 'INSERT INTO comments VALUES (?, ?, ?, ?, ?)',

	insertCharEnableDisable: 'INSERT INTO char_enables_disables VALUES (?, ?, ?)',

	insertCharEsiAuth: function() {
		return 'INSERT INTO char_esi_auths(user_id, channel_id, character_id, character_name, access_token, refresh_token, scope, issued_at) VALUES (?, ?, ?, ?, ?, ?, ?, ' + Date.now() + ')'
	},

	updateCharEsiAuth: function() {
		return 'UPDATE char_esi_auths SET access_token = ?, refresh_token = ?, scope = ?, issued_at = ' + Date.now() + ' WHERE id = ?'
	},

	updateCharEsiAuths: 'UPDATE char_esi_auths SET mute = ? WHERE user_id = ? AND channel_id = ?',

	getCharEsiAuth: function(userID, channelID, characterID) {
		return 'SELECT * FROM char_esi_auths WHERE user_id = "' + userID + '" AND channel_id = "' + channelID + '" AND character_id = "' + characterID + '"'
	},

	getCharEsiAuthById: function(userID, channelID, characterID) {
		return 'SELECT * FROM char_esi_auths WHERE user_id = "' + userID + '" AND channel_id = "' + channelID + '" AND id = "' + characterID + '"'
	},

	removeCharEsiAuthById: function(userID, channelID, characterID) {
		return 'DELETE FROM char_esi_auths WHERE user_id = "' + userID + '" AND channel_id = "' + channelID + '" AND id = "' + characterID + '"'
	},

	getCharEsiAuths: function(userID, channelID) {
		return 'SELECT id, character_id, character_name FROM char_esi_auths WHERE user_id = "' + userID + '" AND channel_id = "' + channelID + '"'
	},

	getAllCharEsiAuths: function(page, offset) {
		return 'SELECT id, character_id, character_name, access_token, refresh_token, channel_id, user_id, mute FROM char_esi_auths LIMIT ' + page + ' OFFSET ' + offset
	},

	getCharEnableDisable: function(userID, channelID, token) {
		return 'SELECT * FROM char_enables_disables WHERE user_id = "' + userID + '" AND channel_id = "' + channelID + '" AND token = "' + token + '"'
	},

	getCharEnableDisableByToken: function(token) {
		return 'SELECT * FROM char_enables_disables WHERE token = "' + token + '"'
	},

	removeCharEnableDisableByToken: function(token) {
		return 'DELETE FROM char_enables_disables WHERE token = "' + token + '"'
	},

	getCharLocation: 'SELECT * FROM char_locations WHERE character_id = ?',

	insertCharOffline: function(id) {
		return 'INSERT INTO char_locations(character_id, location, online, logged_off) VALUES (' + id + ', "", false, ' + Date.now() + ')'
	},

	updateCharOffline: function(id) {
		return 'UPDATE char_locations SET online = false, logged_off = ' + Date.now() + ' WHERE character_id = ' + id
	},

	insertCharLocation: function(id) {
		return 'INSERT INTO char_locations(character_id, location, online, logged_off) VALUES (' + id + ', ?, true, 0)'
	},
	
	updateCharLocation: function(id) {
		return 'UPDATE char_locations SET online = true, location = ? WHERE character_id = ' + id
	},

	getWaits: function(userID, channelID) {
		return 'SELECT type, system, guild_id FROM waits WHERE user_id = "' + userID + '" AND channel_id = "' + channelID + '"'
	},

	removeWait: function(userID, channelID) {
		return 'DELETE FROM waits WHERE user_id = "' + userID + '" AND channel_id = "' + channelID + '"'
	},

	getNotes: function(system, channelID, guildID) {
		var query = 'SELECT author, comment FROM comments WHERE system = "' + system + '"'

	    if(guildID) {
	        query += ' AND guild_id = "' + guildID + '"'
	    } else {
	        query += ' AND channel_id = "' + channelID + '"'
	    }

	    return query
	},

	getNotesCountBySys: function(system) {
		return 'SELECT COUNT(*) FROM comments WHERE system = "' + system + '"'
	},

	getEffect: function(effectID) {
		return 'SELECT hole, effect, c1, c2, c3, c4, c5, c6 FROM effects WHERE id_type = ' + effectID
	},

	getHole: function(holeunclear, wh) {
		return 'SELECT hole, in_class, maxJumpMass, maxStableTime, maxStableMass, massRegeneration FROM holes WHERE ' + (holeunclear ? ('hole LIKE "%' + wh + '"') : ('hole = "' + wh + '"'))
	},

	getSystem: function(whid, wh) {
		return 'SELECT solarsystemid, system, class, effect, statics FROM wormholes WHERE ' + (whid ? 'solarsystemid = "' + wh + '"' : 'system = "' + wh + '"')
	},

	getStatics: function(system) {
		var statics = system.statics.split(",")

        var statics_query = ''

        for (var i = 0; i < statics.length; i++) {
            statics_query += (statics_query.length > 0 ? ' OR ' : '') + 'hole = "' + statics[i] + '"'
        }

        return 'SELECT hole, in_class, maxJumpMass FROM holes WHERE ' + statics_query
	}

}