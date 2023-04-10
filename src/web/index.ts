// Imports
import { createServer } from 'https'
import { log } from '../modules/logging_module/module'
import { returnCertificateCredentials, CertificateCredentials } from '../modules/utility_module/module'
import express, { Express } from 'express'

// Docstring

// Classes

// Enums

// Interface

// Constants
const app: Express = express()

// ENV Constants

// Public Variables

// Private Variables

// _init()
function _init(): void {
	// ENV
	if (process.env.NODE_ENV === 'development') { require('dotenv').config(); }

	// Enable JSON middleware
	app.use(express.json())

	// Log all incoming connections
	app.use((req, _res, next) => { log(`New "${req.protocol.toUpperCase()}" connection to "${req.baseUrl + req.url}" from "${req.ip}" using "${req.method.toUpperCase()}"`); next(); })

	// Routes
	let authorizationEndpoint = require('./routes/authorization/authorization')
	let configurationEndpoint = require('./routes/configuration/configuration')
	app.use("/authorization/api/v1/", authorizationEndpoint)
	app.use("/configuration/api/v1/", configurationEndpoint)

	// Start listening
	let credentials: CertificateCredentials = returnCertificateCredentials()
	let credentialsObject: object = { key: credentials.key, cert: credentials.cert, passphrase: process.env.HTTPS_PASSPHRASE, }

	createServer(credentialsObject, app).listen(process.env.LISTEN_PORT, () => { log(`Initial startup succeeded | Running on port ${process.env.LISTEN_PORT}`) })
}

// Public Methods

// Private Methods

// Callbacks

// Run
_init()