// Imports
import express from 'express'
import { config } from 'dotenv'
import { join } from 'path'
import { log, wrn } from '../../../shared/logging-module/src/logging_module'
let _environmentLoadingError: Error | undefined = config({path: join(process.cwd(), "./.env/.datastore-config.env")}).error

// Docstring
/**
 * Loopware Online Subsystem @ Datastore Server || A ready to go datastore service that can integrate with
 * existing LOSS Modules. This server provides multiple endpoints for directly reading/writing to a database along with 
 * other endpoints that can handle leader boards, player data, and much more
 * Authorization via JWT can be toggled on and off via the AUTH_ENABLED environment variable
 */

// Enums

// Constants
const app = express()
const PORT: number = Number(process.env.PORT)

// Public Variables

// Private Variables

// _init()
function _init(): void{
	// Sanity Checks
	if (_environmentLoadingError != undefined){ wrn(`.ENV file was not successfully loaded | ${_environmentLoadingError.message}`) }

	// Middleware
	app.use(express.json())

	// Logging Middleware
	app.use((req, _res, next) => {
		log(`New "${req.protocol.toUpperCase()}" connection to "${req.baseUrl + req.url}" from "${req.ip}" using "${req.method.toUpperCase()}"`)
		next()
	})

	// Routes
	const _authorizationMiddleware = require('./middleware/authorization')
	const _datastoreRoute = require('./routes/datastore')
	const _leaderboardRoute = require('./routes/leaderboard')
	const _streamRoute = require('./routes/stream')
	app.use(_authorizationMiddleware)
	app.use("/datastore", _datastoreRoute)
	app.use("/leaderboard", _leaderboardRoute)
	app.use("/stream", _streamRoute)

	// Start listening
	app.listen(PORT, () => {
		log(`LOSS @ Datastore-Server started! || Listening on port ${PORT}`)
	})
}

// Public Methods

// Run
_init()