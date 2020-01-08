const request = require('request')
const jwt = require('jsonwebtoken')

function exchangeCode(code, config, callback) {
	request({
        url: 'https://' + config.esi_client_id + ":" + config.esi_client_secret + '@login.eveonline.com/v2/oauth/token',
        method: 'POST',
        json: {
            grant_type: 'authorization_code',
            code: code
        },
        headers: [
            {
                name: 'Content-Type',
                value: 'application/json'
            },
            {
                name: 'Host',
                value: 'login.eveonline.com'
            }
        ]
    }, function (error, response, body) {
        if(error || !body.access_token) return callback(false)

        const decoded = jwt.decode(body.access_token)

    	body.character_name = decoded.name
    	body.scope = decoded.scp
    	body.character_id = decoded.sub.replace("CHARACTER:EVE:", "")

		callback(body)
    })
}

function refreshToken(refresh_token, config, callback) {
	request({
        url: 'https://' + config.esi_client_id + ":" + config.esi_client_secret + '@login.eveonline.com/v2/oauth/token',
        method: 'POST',
        json: {
            grant_type: 'refresh_token',
            refresh_token: refresh_token
        },
        headers: [
            {
                name: 'Content-Type',
                value: 'application/json'
            },
            {
                name: 'Host',
                value: 'login.eveonline.com'
            }
        ]
    }, function (error, response, body) {
        if(error || !body.access_token) return callback(false)

        const decoded = jwt.decode(body.access_token)

    	body.character_name = decoded.name
    	body.scope = decoded.scp
    	body.character_id = decoded.sub.replace("CHARACTER:EVE:", "")

		callback(body)
    })
}

function get(id, token, unit, callback) {
	request('https://esi.evetech.net/latest/characters/' + id + '/' + unit + '/?datasource=tranquility&token=' + token, function (error, response, body) {
        if(error) return callback(false)

		callback(body)
    })
}

// Module export

module.exports = {
    exchangeCode: exchangeCode,
    refreshToken: refreshToken,
    get: get
}