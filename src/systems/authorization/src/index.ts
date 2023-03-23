// Imports
import { join } from 'path'
import { createServer } from 'https'
import { log, wrn } from '../../../shared/logging-module/src/logging_module'
import { returnHTTPSCredentials } from '../../../shared/general-utility-module/src/general_utility_module'
import { config } from 'dotenv'
import express, { Express } from 'express'


// Docstring
/**
 * Loopware Online Subsystem @ Authorization Server || The authorization server provides a secure way for clients to verify their identity with Loss.
 * Clients provide their client token and in return are given a refresh-access token pair. Client tokens are generated via the dashboard
 */

// Enums

// Interface

// Constants
const app: Express = express()
const ENV_LOADING_ERROR: Error | undefined = config({ path: join(process.cwd(), './.env/.lossConfig.env') }).error

// ENV Constants
const PORT: number = Number(process.env.AUTH_LISTEN_PORT)
const PASSPHRASE: string = String(process.env.HTTPS_CERT_PASSPHRASE)

// Public Variables

// Private Variables

// _init()
function _init(): void {
	// Sanity Checks
	if (ENV_LOADING_ERROR != undefined) { wrn(`.ENV file was not successfully loaded | ${ENV_LOADING_ERROR.message}`) }

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
	let credentialData: object | any = returnHTTPSCredentials()
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