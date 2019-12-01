const request = require('request')

function iteration(kills, solarsystemID, seconds, page, callback) {
	request("https://zkillboard.com/api/kills/solarSystemID/" + solarsystemID + "/pastSeconds/" + seconds + "/page/" + page + "/", function(error, response, _kills) {
		if(!error) {
			const __kills = JSON.parse(_kills)

			kills = kills.concat(__kills)

			if(__kills.length < 200) return callback(kills)

			page++

			iteration(kills, solarsystemID, seconds, page, callback)
		}
	})
}

module.exports = {

	getSystemKills: function(solarsystemID, seconds, callback, timeout) {
		setTimeout(function(){
			iteration([], solarsystemID, seconds, 1, callback)
		}, timeout)
	},

	getSystemStats: function(solarsystemID, callback) {
		request("https://zkillboard.com/api/stats/solarSystemID/" + solarsystemID + "/", function(error, response, stats) {
			if(!error) callback(JSON.parse(stats))
		})
	}

}