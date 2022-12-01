// Handles authentication of any incoming request to the server
// v1.1

//Express
const express = require('express')
const router = express.Router()

// Auth Utils
const { generate_new_api_keys, } = require('./AuthUtils')

// Logger
const logger = require('../custom/logger')

router.use((req, res, next) => {
	let authorization_header = req.headers.authorization.replace("Bearer ", "")
	let hashed_authorization_header = `Bearer ${crypto.createHash("sha256").update(authorization_header).digest('base64')}`

	if (req.url == "/api/register"){
		next()
	}

	if (hashed_authorization_header != test_key){
		res.status(401).json({
			"message": "Invalid API key"
		})
	}

	next()
})

router.get("/api/register", (req, res) => {
	let keys = none
})

module.exports = router