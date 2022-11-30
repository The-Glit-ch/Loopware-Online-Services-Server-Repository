// Handles authentication of any incoming request to the server

//Express
const express = require('express')
const router = express.Router()

// Crypto
const crypto = require('crypto')

// Logger
const logger = require('../custom/logger')


// Set


router.use((req, res, next) => {
	logger.formated_log("Connection")
	crypto.Hash()
	logger.formated_log(crypto.randomBytes(32))
	next()
})

module.exports = router