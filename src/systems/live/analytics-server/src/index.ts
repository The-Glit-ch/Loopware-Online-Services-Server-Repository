// Imports
import { join } from 'path'
import { createServer } from 'https'
import { log, wrn } from '../../../../shared/logging-module/src/logging_module'
import { returnHTTPSCredentials } from '../../../../shared/general-utility-module/src/general_utility_module'
import { config } from 'dotenv'
import express, { Express } from 'express'

// Docstring
/**
 * Loopware Online Subsystem @ Analytics Server || Manages the reading and writing of any analytical data created by Loss services. Data is stored
 * in a Redis database.
 * DO NOT EXPOSE TO THE PUBLIC INTERNET. THIS HAS NO IP BLACKLISTING
 */

// Enums

// Interface

// Constants
const app: Express = express()
const ENV_LOADING_ERROR: Error | undefined = config({ path: join(process.cwd(), './.env/.lossConfig.env') }).error

// ENV Constants
const PORT: number = Number(process.env.ANALYTICS_LISTEN_PORT)
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
	const _analyticsEndpoint = require('./routes/analytics')
	app.use("/analytics/api/v1/", _analyticsEndpoint)

	// Obtain credentials
	let credentialData: object | any = returnHTTPSCredentials()
	let credentials: object = {
		key: credentialData.key,
		cert: credentialData.cert,
		passphrase: PASSPHRASE,
	}

	// Start listening
	createServer(credentials, app).listen(PORT, () => {
		log(`LOSS @ Analytics-Server started! || Listening on port ${PORT}`)
	})
}

// Public Methods

// Private Methods

// Run
_init()