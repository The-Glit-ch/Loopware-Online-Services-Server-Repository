// Imports
import express from 'express'
import { createServer } from 'https'
import { config } from 'dotenv'
import { join } from 'path'
import { log, wrn } from '../../../shared/logging-module/src/logging_module'
import { returnHTTPSCredentials } from '../../../shared/general-utility-module/src/general_utility_module'
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

// ENV Constants
const PORT: number = Number(process.env.AUTH_LISTEN_PORT)
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
	const _authorizationEndpoint = require('./routes/authorization')
	const _dashboardAccessEndpoint = require('./routes/dashboard')
	const _authorizationModuleAccessEndpoint = require('./routes/authmodule')
	app.use("/authorization/api/v1/", _authorizationEndpoint)
	app.use("/authorization/_/dashboard/api/v1/", _dashboardAccessEndpoint)
	app.use("/authorization/_/authmodule/api/v1/", _authorizationModuleAccessEndpoint)

	// Obtain credentials
	let credentialData: object | any = returnHTTPSCredentials(join((process.cwd()), './keys'))
	let credentials: object = {
		key: credentialData.key,
		cert: credentialData.cert,
		passphrase: PASSPHRASE,
	}

	// Start listening
	createServer(credentials, app).listen(PORT, () => {
		log(`LOSS @ Authorization-Server started! || Listening on port ${PORT}`)
	})
}

// Public Methods

// Private Methods

// Run
_init()