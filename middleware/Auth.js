// Handles authentication of any incoming request to the server
// v1.1

//Express
const express = require('express')
const router = express.Router()

// Auth Utils
const authutils = require('./AuthUtils')

// Logger
const logger = require('../custom/logger')

router.use(async (req, res, next) => {
	if (req.url == "/api/register"){return next()}
	if (req.headers.authorization == null){return res.status(401).json({"message": "No API key provided"})}

	let authorization_header = req.headers.authorization.replace("Bearer ", "")
	let hashed_authorization_header = authutils.hash_incoming_key(authorization_header)
	let server_key = await authutils.read_api_key_from_file() // Why javascript

	if (hashed_authorization_header != server_key){return res.status(401).json({"message": "Invalid API key"})}
	
	next()
})

router.get("/api/register", (req, res) => {
	logger.formated_log("Generating new API key")
	let [client_token, server_token] = authutils.generate_new_api_key()
	authutils.write_api_key_to_file(server_token)

	res.status(200).json({
		"api_key": client_token
	})
	logger.formated_log("API key sent to requester")
})

module.exports = router