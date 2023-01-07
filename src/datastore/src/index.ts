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
const PORT: string | number = process.env.PORT || 8080
const AUTH_ENABLED: string | boolean = process.env.AUTH_ENABLED || false

// Public Variables

// Private Variables


// _init()
function _init(): void{
	// Sanity Checks
	if (_environmentLoadingError != undefined){ wrn(`.ENV file was not successfully loaded | ${_environmentLoadingError.message}`) }
	if (!AUTH_ENABLED && _environmentLoadingError == undefined){ wrn("Authorization middleware is DISABLED") }

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
	if (AUTH_ENABLED){ app.use(_authorizationMiddleware) }
	app.use("/datastore", _datastoreRoute)

	// Start listening
	app.listen(PORT, () => {
		log(`LOSS @ Datastore-Server started! || Listening on port ${PORT}`)
	})
}

// Public Methods

// Run
_init()