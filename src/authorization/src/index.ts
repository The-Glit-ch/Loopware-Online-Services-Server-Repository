// Imports
import express from 'express';
import { config } from 'dotenv';
import { join } from 'path'
import { log, wrn } from '../../../shared/logging-module/src/logging_module'
let _environmentLoadingError: Error | undefined = config({path: join(process.cwd(), './.env/.lossConfig.env')}).error

// Docstring
/**
 * Loopware Online Subsystem @ Authorization Server || A simple, ready to go, Authorization Server
 * that provides OAUTH to incoming clients. Any incoming client provides the OAUTH server their Client ID
 * to begin the OAUTH process
 */

// Enums

// Interface

// Constants
const app = express()
const PORT: number = Number(process.env.AUTH_LISTEN_PORT)

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
	const _authorizationEndpoint = require('./routes/authorization')
	const _dashboardAccessEndpoint = require('./routes/dashboard')
	app.use("/auth", _authorizationEndpoint)
	app.use("/auth/_", _dashboardAccessEndpoint)

	// Start listening
	app.listen(PORT, () => {
		log(`LOSS @ Authorization-Server started! || Listening on port ${PORT}`)
	})
}

// Public Methods

// Private Methods

// Run
_init()