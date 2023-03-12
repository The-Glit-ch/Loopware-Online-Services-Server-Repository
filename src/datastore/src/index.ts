// Imports
import express from 'express'
import { createServer } from 'https'
import { config } from 'dotenv'
import { join } from 'path'
import { returnHTTPSCredentials } from '../../../shared/general-utility-module/src/general_utility_module'
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
const PASSPHRASE: string = String(process.env.HTTPS_CERT_PASSPHRASE)

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
	const _leaderboardRoute = require('./routes/leaderboard')
	app.use(_authorizationMiddleware)
	app.use("/datastore/api/v1/", _datastoreRoute)
	app.use("/streaming/api/v1/", _streamingRoute)
	app.use("/leaderboard/api/v1/", _leaderboardRoute)

	// Obtain credentials
	let credentialData: object | any = returnHTTPSCredentials(join((process.cwd()), './keys'))
	let credentials: object = {
		key: credentialData.key,
		cert: credentialData.cert,
		passphrase: PASSPHRASE,
	}

	// Start listening
	createServer(credentials, app).listen(PORT, () => {
		log(`LOSS @ Datastore-Server started! || Listening on port ${PORT}`)
	})
}

// Public Methods

// Run
_init()