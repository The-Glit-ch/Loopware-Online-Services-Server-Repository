// Imports
import { log, wrn, err } from '../../../../shared/logging-module/src/logging_module'
import { generateNewClientID, NewClientIDData } from '../../../../shared/authorization-module/src/authorization_module'
import express, { Router } from 'express'
import { Collection, Db, MongoClient } from 'mongodb'

// Docstring
/**
 * Loopware Online Subsystem @ Dashboard Access Endpoint || Allows for configuration and status of the
 * Authorization server via the Loss dashboard/cli
 */

// Enums

// Interface

// Constants
const router: Router = express.Router()
const clientTokenStorageAgent: MongoClient = new MongoClient(String(process.env.AUTH_MONGO_CLIENT_TOKEN_STORAGE_URI))
const CLIENT_TOKEN_STORAGE_COLLECTION_NAME: string = String(process.env.AUTH_MONGO_CLIENT_TOKEN_STORAGE_COLLECTION_NAME)

// Public Variables

// Private Variables
var _connectedToClientTokenStorageDB: boolean = true

// _init()
async function _init(): Promise<void> {
	// Only allow local host
	router.use((req, res, next) => {
		if (req.ip == "127.0.0.1") { next(); return; }

		res.status(403).json({ code: 403, message: "Forbidden" })
		return
	})

	// Connect to Client Storage
	try {
		await clientTokenStorageAgent.connect()
		log(`Connection to Mongo@ClientTokenStorage was successful`)
		_connectedToClientTokenStorageDB = true
	} catch (error) {
		wrn(`Connection to Mongo@ClientTokenStorage was unsuccessful | ${error}`)
		_connectedToClientTokenStorageDB = false
	}
}

// Public Methods
router.post("/new-client", (req, res, next) => {
	// Retrieve incoming data
	let incomingData: object | any = req.body

	// Is payload empty?
	if (Object.keys(incomingData).length === 0) { res.status(400).json({ code: 400, message: "Empty request" }); return; }

	// Store data
	let appName = incomingData.appName

	// Validate data
	if (appName == undefined || appName == null) { res.status(400).json({ code: 400, message: "Bad request" }); return; }

	// Generated new client ID
	let newToken: NewClientIDData = generateNewClientID()

	// Check connection
	if (!_connectedToClientTokenStorageDB) { res.status(500).json({ code: 500, message: "Database Offline" }); return; }

	// Write data
	try {
		let currentDB: Db = clientTokenStorageAgent.db()
		let currentCollection: Collection = currentDB.collection(CLIENT_TOKEN_STORAGE_COLLECTION_NAME)
		let writeData: object = {
			clientToken: newToken.clientToken,
			serverAccessToken: newToken.serverAccessToken,
			serverRefreshToken: newToken.serverRefreshToken,
			appName: appName,
		}
		currentCollection.insertOne(writeData)
			.catch((error) => {
				err(`Database error while writing data to [${currentCollection.collectionName}@${currentDB.databaseName}] | ${error}`)
				res.status(500).json({ code: 500, message: "Error writing data" })
				return
			})
			.then(() => {
				log(`Successfully wrote data to [${currentCollection.collectionName}@${currentDB.databaseName}]`)
				res.status(200).json({ code: 200, message: "Success", data: { clientToken: newToken.clientToken } })
				return
			})
	} catch (error) {
		err(`Fatal error occurred on "/new-client" endpoint | ${error}`)
		res.status(500).json({ code: 500, message: "Fatal error" })
		return
	}
})

// Private Methods
function _retryConnection(): void {
	let count: number = 0
	let interval: NodeJS.Timer = setInterval(async () => { log(`Retrying...(${count})`); count++; await clientTokenStorageAgent.connect(); }, 2000)
	clientTokenStorageAgent.on('serverHeartbeatSucceeded', () => { clearInterval(interval) })
}

// Run
clientTokenStorageAgent.on('serverHeartbeatSucceeded', () => {
	if (!_connectedToClientTokenStorageDB) { log(`Reconnected to Mongo@ClientTokenStorage`); _connectedToClientTokenStorageDB = true; }
})

clientTokenStorageAgent.on('serverHeartbeatFailed', () => {
	wrn(`Connection to Mongo@ClientTokenStorage was dropped | Attempting reconnection`)
	if (_connectedToClientTokenStorageDB == true) { _retryConnection() }
	_connectedToClientTokenStorageDB = false
})

_init()
module.exports = router