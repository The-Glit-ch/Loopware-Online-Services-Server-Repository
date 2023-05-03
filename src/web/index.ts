// Imports
import { createServer } from 'https';

import { LossLoggingModule } from '../modules/logging_module/module';
import { LossSecurityModule } from '../modules/security_module/security_module';
import { MongoConnectionInformation } from '../common/interfaces/mongo_connection_information';
import { LossUtilityModule, HTTPSCertificateData } from '../modules/utility_module/module';

import { MongoClient } from 'mongodb';
import express, { Express, Router } from 'express';

// Docstring
/**
 * Loopware Online Subsystem @ Index.js
 * The main server file. Here everything is imported, initialized, configured, and then added
 * to the current runtime
 */

// Classes

// Enums

// Interfaces

// Constants
export const app: Express = express()
const VERSION_STRING: string = "vPRE-1.0.0"

// Public Variables

// Private Variables

// _init()
async function _init(): Promise<void> {
	// Development
	if (process.env.NODE_ENV !== 'production') { require('dotenv').config(); }

	/**
	 * Server environment configuration
	 * @see https://github.com/motdotla/dotenv/issues/562
	 * @see https://expressjs.com/en/4x/api.html#app.get
	 * @see https://expressjs.com/en/4x/api.html#app.set
	 * @summary - TLDR: We are essentially "caching" our environment variables with Express.js .set/.get methods. This will not only reduce the amount of times
	 * we call "process.env.XXXXX" but also speed up performance and improve security marginally. Each variable should be prefixed with "LOSS_" followed by the
	 * environment variable name. This is to avoid any conflicts 
	 */
	app.set('env', process.env.NODE_ENV)
	app.set('LOSS_NODE_ENV', process.env.NODE_ENV)
	app.set('LOSS_ENV_SERVER_CONFIGURATION_LISTENING_PORT', process.env.ENV_SERVER_CONFIGURATION_LISTENING_PORT)
	app.set('LOSS_ENV_SERVER_CONFIGURATION_CERTIFICATE_DECRYPTION_PASSPHRASE', process.env.ENV_SERVER_CONFIGURATION_CERTIFICATE_DECRYPTION_PASSPHRASE)

	// Module instancing
	const lossLoggingModule: LossLoggingModule = await LossLoggingModule.init();
	const lossUtilityModule: LossUtilityModule = await LossUtilityModule.init();
	const lossSecurityModule: LossSecurityModule = await LossSecurityModule.init();
	const allModules: object = { lossLoggingModule: lossLoggingModule, lossSecurityModule: lossSecurityModule, LossUtilityModule: lossUtilityModule, }

	// Database connections
	let connectedMongoDatabases: Array<MongoConnectionInformation> = []
	const toBeConnectedDatabases: Array<Promise<MongoClient>> = [
		new MongoClient(String(process.env.ENV_SPACE_GUARD_DATABASE_CLIENT_TOKEN_STORAGE_CONNECTION_URL)).connect(),
		new MongoClient(String(process.env.ENV_SPACE_GUARD_DATABASE_LIVE_TOKEN_STORAGE_CONNECTION_URL)).connect(),
		new MongoClient(String(process.env.ENV_COSMIC_STORAGE_DATABASE_DATASTORE_STORAGE_CONNECTION_URL)).connect(),
		new MongoClient(String(process.env.ENV_COSMIC_STORAGE_DATABASE_LEADERBOARD_STORAGE_CONNECTION_URL)).connect(),
	]

	await Promise.all(toBeConnectedDatabases)
		.catch((error: Error) => { lossLoggingModule.err(`Error while connecting to database | ${error}`); return; })
		.then((mongoClients: Array<MongoClient> | void) => {
			if (!mongoClients) { return; }
			mongoClients.forEach((client: MongoClient) => {
				// Add to connected databases array
				connectedMongoDatabases.push({ client: client, databaseName: client.db().databaseName, isConnected: true, })

				// Log
				lossLoggingModule.log(`[INIT] Mongo@${connectedMongoDatabases[connectedMongoDatabases.length - 1].databaseName} successfully connected`)

				// Get a reference to the connection information
				const connectionInformation: MongoConnectionInformation = connectedMongoDatabases[connectedMongoDatabases.length - 1]
				client = connectionInformation.client

				// Add listen events
				client.on('serverHeartbeatSucceeded', async () => {
					if (!connectionInformation.isConnected) { lossLoggingModule.log(`Reconnected to Mongo@${connectionInformation.databaseName}`); connectionInformation.isConnected = true; }
				})

				client.on(`serverHeartbeatFailed`, async () => {
					lossLoggingModule.wrn(`Connection to Mongo@${connectionInformation.databaseName} dropped | Attempting reconnection...`)
					if (connectionInformation.isConnected) { _retryMongoDatabaseConnection(client, connectionInformation.databaseName, lossLoggingModule); connectionInformation.isConnected = false; }
				})

				// Add to "env"
				// TODO: Maybe re-work this?
				app.set(`LOSS_DATABASE_${connectionInformation.databaseName.toUpperCase()}`, connectedMongoDatabases[connectedMongoDatabases.length - 1])
			})

			// Log
			lossLoggingModule.log(`[INIT] All databases connected`)
		})

	// Middleware
	const loggingMiddleware: Router = await require('./middleware/logger').init(app, allModules)
	const localhostMiddleware: Router = await require('./middleware/localhost').init(app, allModules)
	app.use(loggingMiddleware)
	app.use(express.json())

	// Routes
	const spaceguardServiceRoute: Router = await require('./routes/space-guard-service/spaceguard').init(app, allModules)
	const configurationRoute: Router = await require('./routes/configuration/configuration').init(app, allModules)
	app.use('/space-guard/api/v1/', spaceguardServiceRoute)
	app.use('/configuration/api/v1/', localhostMiddleware, configurationRoute)

	// Certificate retrieval
	let certificateData: HTTPSCertificateData = { keyData: "", certData: "", }
	await lossUtilityModule.returnHTTPSCertificates()
		.catch((error) => { lossLoggingModule.err(`Error while loading HTTPS certificate data. Falling back to HTTP | ${error}`); })
		.then((data: HTTPSCertificateData | void) => { if (data) { certificateData = data; }; })

	// Finalization
	const PORT: number = app.get('LOSS_ENV_SERVER_CONFIGURATION_LISTENING_PORT')
	const PASSPHRASE: string = app.get('LOSS_ENV_SERVER_CONFIGURATION_CERTIFICATE_DECRYPTION_PASSPHRASE')
	const listenOptions: object | any = { key: certificateData.keyData, cert: certificateData.certData, passphrase: PASSPHRASE, }

	// Listen
	if (listenOptions.key != "" && listenOptions.cert != "") { createServer(listenOptions, app).listen(PORT, () => { lossLoggingModule.log(`Loopware Online Subsystem Server ${VERSION_STRING} is now online | Listening on port ${PORT}`); }); }
	else { app.listen(PORT, () => { lossLoggingModule.wrn(`Warning: Running in HTTP`); lossLoggingModule.log(`Loopware Online Subsystem Server ${VERSION_STRING} is now online | Listening on port ${PORT}`); }); }
}

// Public Methods

// Private Methods
/**
 * Retries connecting to a mongo database until successful
 * @param { MongoClient } mongoClient - The MongoDB client
 * @param { string } databaseName - The database name
 * @param { LossLoggingModule } lossLoggingModule - The logging module
 * @returns { Promise<void> } void
 */
async function _retryMongoDatabaseConnection(mongoClient: MongoClient, databaseName: string, lossLoggingModule: LossLoggingModule): Promise<void> {
	let retryCount: number = 0
	const retryLoop: NodeJS.Timer = setInterval(async () => { lossLoggingModule.log(`Retrying connection for Mongo@${databaseName}...(${retryCount})`); await mongoClient.connect(); retryCount++; }, 2000)
	mongoClient.on('serverHeartbeatSucceeded', () => { clearInterval(retryLoop); })
}

// Run
_init()