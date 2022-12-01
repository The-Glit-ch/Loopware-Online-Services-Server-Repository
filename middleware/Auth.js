// Handles authentication of any incoming request to the server

//Express
const express = require('express')
const router = express.Router()

// Crypto
const crypto = require('crypto')

// Filesystem
const fs = require('fs')

// Logger
const logger = require('../custom/logger')


// Init Process
function main(){
	// Check if there is a token already saved
	// If not generate a new token

}

function generate_new_keys(r_byte_limit){
	let buffer = crypto.randomBytes(r_byte_limit)
	let hash = crypto.createHash('sha256')
	let private_key = buffer.toString('hex')
	let public_key = hash.update(private_key).digest().toString('hex')

	logger.formated_log(private_key)
	logger.formated_log(public_key)
}



// Set

router.use((req, res, next) => {
	logger.formated_log("Connection")
	// logger.formated_log(crypto.randomBytes(32))
	next()
})


router.get("/api", (req, res) => {
	let auth_header = req.headers.authorization
	res.status(200).json({
		"current_status": "alive",
	})
})

generate_new_keys(32)


module.exports = router