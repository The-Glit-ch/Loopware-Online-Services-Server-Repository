// User endpoint

// Express
import express from 'express'
const router = express.Router()

// Logger
import { log } from '../../../shared/logger/src/logging_module'

router.use((req, res, next) => {
	log(`New "${req.protocol.toUpperCase()}" connection to "${req.baseUrl}" from "${req.ip}" using "${req.method.toUpperCase()}"`)
	next()
})

module.exports = router
