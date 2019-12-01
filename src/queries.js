module.exports = {

	insertWait: 'INSERT INTO waits VALUES (?, ?, ?, ?, ?)',
	insertComment: 'INSERT INTO comments VALUES (?, ?, ?, ?, ?)',

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