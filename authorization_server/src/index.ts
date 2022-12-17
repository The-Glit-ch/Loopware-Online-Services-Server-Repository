// Imports
import express from 'express';
import { config } from 'dotenv';
import { join } from 'path'
import { log, err } from '../../shared/logger/src/logging_module'

// Docstring
/*
* Loopware Online Subsystem @ Authorization Server || A simple, ready to go, Authorization Server
* that provides OAUTH to incoming clients. Any incoming client provides the OAUTH server their Client ID
* to begin the OAUTH process
*/

// Enums

// Constants
const app = express()
const PORT = process.env.PORT || 8081 // Fallback in case of anything

// Public Variables

// Private Variables
let _environmentLoadingError: Error | undefined = config({path: join(process.cwd(), './.env/.auth-config.env')}).error // Only use .env files for local testing and debugging. Final builds should not include this

// _init()
function _init(): void{
	// Do a quick sanity check
	if (_environmentLoadingError != undefined){ err(`.ENV file was not successfully loaded || ${_environmentLoadingError.message}`) }

	// Enable JSON parsing express middleware
	app.use(express.json())

	// Log all incoming connections to the server
	app.use((req, _res, next) => {
		log(`New "${req.protocol.toUpperCase()}" connection to "${req.baseUrl + req.url}" from "${req.ip}" using "${req.method.toUpperCase()}"`)
		next()
	})

	// Setup routing
	const _serverEndpoint = require('./routes/server')
	
	app.use("/auth/server", _serverEndpoint)

	// Start listening
	app.listen(PORT, () => {
		log(`LOSS@Authorization-Server started! || Listening on port ${PORT}`)
	})

}

// Public Methods

// Private Methods

// Exports

_init()