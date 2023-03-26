// Imports
import { join } from 'path'
import { createServer } from 'https'
import { log, wrn } from '../../../../shared/logging-module/src/logging_module'
import { returnHTTPSCredentials } from '../../../../shared/general-utility-module/src/general_utility_module'
import { config } from 'dotenv'
import express, { Express } from 'express'

// Docstring
/**
 * Loopware Online Subsystem @ Configuration Server || ALlows for the configuration of Loss services live during deployment
 */

// Enums

// Interface

// Constants
const app: Express = express()
const ENV_LOADING_ERROR: Error | undefined = config({ path: join(process.cwd(), './.env/.lossConfig.env') }).error

// ENV Constants
const PORT: number = Number(process.env.LIVE_CONFIGURATION_LISTEN_PORT)
const PASSPHRASE: string = String(process.env.HTTPS_CERT_PASSPHRASE)

// Public Variables

// Private Variables

// _init()
function _init(): void {
	// Sanity Checks
	if (ENV_LOADING_ERROR != undefined) { wrn(`.ENV file was not successfully loaded | ${ENV_LOADING_ERROR.message}`) }

	// Enable JSON parsing express middleware
	app.use(express.json())

	// Only allow local host
	app.use((req, res, next) => {
		if (req.ip != "::ffff:127.0.0.1") { res.status(403).json({ code: 403, message: "Forbidden" }); return }
		next()
	})

	// Log all incoming connections to the server
	app.use((req, _res, next) => {
		log(`New "${req.protocol.toUpperCase()}" connection to "${req.baseUrl + req.url}" from "${req.ip}" using "${req.method.toUpperCase()}"`)
		next()
	})

	// Setup routing
	const _authorizationEndpoint = require('./routes/authorization')
	app.use("/config/api/v1/authorization/", _authorizationEndpoint)

	// Obtain credentials
	let credentialData: object | any = returnHTTPSCredentials()
	let credentials: object = {
		key: credentialData.key,
		cert: credentialData.cert,
		passphrase: PASSPHRASE,
	}

	// Start listening
	createServer(credentials, app).listen(PORT, () => {
		log(`LOSS @ Live/Configuration-Server started! || Listening on port ${PORT}`)
	})
}

// Public Methods

// Private Methods

// Run
_init()