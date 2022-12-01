// Time information from the server
// Endpoints
//	|--> /time/ || [GET]

// Express
const express = require('express')
const router = express.Router()

// Date FNS
const { getUnixTime, getYear, getMonth, getDate, getHours, getMinutes, getSeconds } = require('date-fns')

// Logger
const logger = require("../custom/logger")

router.use((req, res, next) => {
	logger.formated_log(`Endpoint "${req.baseUrl}" triggered`)
	next()
})

router.get("/", (req, res) => {
	let current_time = Date.now()

	res.status(200).json({
		"timestamp_millisecond": current_time,
		"timestamp_unix": getUnixTime(current_time),
		"year": getYear(current_time),
		"month": getMonth(current_time),
		"day": getDate(current_time),
		"hour": getHours(current_time),
		"minute": getMinutes(current_time),
		"second": getSeconds(current_time)
	})
})

module.exports = router