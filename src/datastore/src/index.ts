// Imports
import express from 'express'
import { config } from 'dotenv'
import { join } from 'path'
import { log, wrn } from '../../../shared/logging-module/src/logging_module'
let _environmentLoadingError: Error | undefined = config({path: join(process.cwd(), './.env/.lossConfig.env')}).error

// Docstring
/**
 * Loopware Online Subsystem @ Datastore Server || A versatile and configurable data storage solution that allows you to read and write user generated data.
 * Features a standard datastore solution allowing you to interface with a mongodb instance, a leaderboard service, and an online asset streaming service
 */

// Enums

// Interface

// Constants
const app = express()

// ENV Constants
const PORT: number = Number(process.env.DS_LISTEN_PORT)

// Public Variables

// Private Variables

// _init()
function _init(): void{
	// Sanity Checks
	if (_environmentLoadingError != undefined){ wrn(`.ENV file was not successfully loaded | ${_environmentLoadingError.message}`) }

	// Enable JSON parsing express middleware
	app.use(express.json())

	// Log all incoming connections to the server
	app.use((req, _res, next) => {
		log(`New "${req.protocol.toUpperCase()}" connection to "${req.baseUrl + req.url}" from "${req.ip}" using "${req.method.toUpperCase()}"`)
		next()
	})

	// Setup routing
	const _authorizationMiddleware = require('./middleware/authorization')
	const _datastoreRoute = require('./routes/datastore')
	const _streamingRoute = require('./routes/streaming')
	app.use(_authorizationMiddleware)
	app.use("/datastore/api/v1/", _datastoreRoute)
	app.use("/streaming/api/v1/", _streamingRoute)

	// Start listening
	app.listen(PORT, () => {
		log(`LOSS @ Datastore-Server started! || Listening on port ${PORT}`)
	})
}

// Public Methods

// Run
_init()