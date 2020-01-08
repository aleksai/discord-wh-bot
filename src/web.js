const fs = require('fs')

module.exports = {

	routes: function(http, bin) {
		http.get('/enable/:userId/:channelId/:token', bin.enableChar)
		http.get('/disable/:userId/:channelId/:token', bin.disableChar)
		http.get('/disable/:userId/:channelId/:token/:characterId', bin.disableCharFinish)
		http.get('/callback', bin.callbackChar)
	},

	send: function(res, content) {
		fs.readFile(__dirname + '/../public/index.html', (err, data) => {
			if(data) {
				var html = data.toString()

				var rx = new RegExp("<!-- CONTENT[\\d\\D]*?\/CONTENT -->", "g");

				html = html.replace(rx, content)

				res.send(html)
			}
		})
	}

}