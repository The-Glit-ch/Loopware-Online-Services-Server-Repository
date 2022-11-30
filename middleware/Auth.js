// Will handle AUTH of any incoming request

//Express
const express = require('express')
const router = express.Router()

// Logger
const logger = require('../custom/logger')

router.use((req, res, next) => {
	logger.formated_log("Connection")
	next()
})

module.exports = router