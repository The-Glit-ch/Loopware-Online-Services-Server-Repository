// Imports
import { createServer } from 'https'
import { log, wrn, err } from '../modules/logging_module/module'
import { returnCertificateCredentials, CertificateCredentials } from '../modules/utility_module/module'
import { MongoClient } from 'mongodb'
import express, { Express } from 'express'

// Docstring

// Classes

// Enums

// Interface
export interface MongoConnectionInformation {
	client: MongoClient,
	isConnected: boolean,
	databaseName: string,
}

// Constants
export const app: Express = express()

// ENV Constants

// Public Variables

// Private Variables

// _init()
async function _init(): Promise<void> {
	// ENV
	if (process.env.NODE_ENV !== 'production') { require('dotenv').config(); }

	// Configure the runtime environment
	// https://github.com/motdotla/dotenv/issues/562 | TLDR: We are essentially "caching" these variables with express's .get/.set functions. 
	// This will not only improve runtime speeds but also disallowing anyone from changing the environment variable during runtime
	// The best thing to do is to load the environment and then set/get them with app.set/get
	// Should be prefixed with "LOSS_" followed by the name to avoid conflicts
	app.set('env', process.env.NODE_ENV)
	app.set('LOSS_NODE_ENV', process.env.NODE_ENV)
	app.set('LOSS_IS_PRODUCTION', (process.env.NODE_ENV === "production") ? (true) : (false))
	app.set('LOSS_LISTENING_PORT', process.env.LISTENING_PORT)
	app.set('LOSS_CERTIFICATE_DECRYPTION_KEY', process.env.CERTIFICATE_DECRYPTION_KEY)
	app.set('LOSS_MIDDLEWARE_LOCALHOST', require('./middleware/localhost'))

	// Mongo setup
	// Instead of making multiple connections like previous version we instead share one connection
	let connectedDatabases: Array<MongoConnectionInformation> = []

	// Try to connect to the database(s)
	await Promise.all([ new MongoClient(String(process.env.MONGO_CLIENT_TOKEN_STORAGE_URL)).connect(), new MongoClient(String(process.env.MONGO_LIVE_TOKEN_STORAGE_URL)).connect(), ])
		.catch((error: any) => { err(`Error while establishing connection to database | ${error}`); })
		.then((mongoClients: Array<MongoClient> | void ) => { if (!mongoClients){ return; }; mongoClients.forEach((client: MongoClient) => { connectedDatabases.push({ client: client, isConnected: true, databaseName: client.db().databaseName, }); }); })
	
	// Add to environment
	app.set('LOSS_DATABASE_CLIENT_TOKEN_STORAGE', connectedDatabases[0])
	app.set('LOSS_DATABASE_LIVE_TOKEN_STORAGE', connectedDatabases[1])

	// Setup event listeners
	connectedDatabases.forEach((mongoConnection: MongoConnectionInformation) => {
		// Reconnection event
		mongoConnection.client.on('serverHeartbeatSucceeded', () => { if (!mongoConnection.isConnected) { console.log(`Reconnected to Mongo@${mongoConnection.databaseName}`); mongoConnection.isConnected = true; }; })

		// Disconnection event
		mongoConnection.client.on('serverHeartbeatFailed', () => {
			wrn(`Connection to Mongo@${mongoConnection.databaseName} dropped | Attempting reconnection...`)
			if (mongoConnection.isConnected) { _retryMongoConnection(mongoConnection.client, mongoConnection.databaseName); mongoConnection.isConnected = false; }
		})
	})

	// Enable JSON middleware
	app.use(express.json())

	// Log all incoming connections
	app.use((req, _res, next) => { log(`New "${req.protocol.toUpperCase()}" connection to "${req.baseUrl + req.url}" from "${req.ip}" using "${req.method.toUpperCase()}"`); next(); })

	// Routes
	let authorizationEndpoint = require('./routes/authorization/authorization')
	let configurationEndpoint = require('./routes/configuration/configuration')
	app.use("/authorization/api/v1/", authorizationEndpoint)
	app.use("/configuration/api/v1/", configurationEndpoint)

	// Retrieve port and decryption key
	const PORT: number = app.get('LOSS_LISTENING_PORT')
	const CERTIFICATE_DECRYPTION_KEY: string = app.get('LOSS_CERTIFICATE_DECRYPTION_KEY')

	// Prepare certificates
	let credentials: CertificateCredentials = returnCertificateCredentials()
	let credentialsObject: object = { key: credentials.key, cert: credentials.cert, passphrase: CERTIFICATE_DECRYPTION_KEY, }

	// Start listening
	createServer(credentialsObject, app).listen(PORT, () => { log(`Initial startup succeeded | Running on port ${PORT}`) })
}

// Public Methods

// Private Methods
function _retryMongoConnection(mongoClient: MongoClient, databaseName: string): void {
	let retryCount: number = 0
	let retryLoop: NodeJS.Timer = setInterval(async () => { log(`Retrying connection for Mongo@${databaseName}...(${retryCount})`); retryCount++; await mongoClient.connect(); }, 2000)
	mongoClient.on('serverHeartbeatSucceeded', () => { clearInterval(retryLoop); })
}

// Callbacks

// Run
_init()