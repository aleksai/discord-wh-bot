module.exports = {

	routes: function(http, bin) {
		http.get('/enable/:userId/:channelId/:token', bin.enableChar)
		http.get('/disable/:userId/:channelId/:token', bin.disableChar)
		http.get('/disable/:userId/:channelId/:token/:characterId', bin.disableCharFinish)
		http.get('/callback', bin.callbackChar)
	}

}