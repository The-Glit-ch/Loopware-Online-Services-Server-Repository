// Imports
import { log, wrn, err } from '../../../../../shared/logging-module/src/logging_module'
import { objectNullCheck } from '../../../../../shared/general-utility-module/src/general_utility_module'
import { generateNewClientToken, NewClientTokenData } from '../../../../../shared/authorization-module/src/authorization_module'
import express, { Router } from 'express'
import { Collection, Db, MongoClient } from 'mongodb'

// Docstring
/**
 * Loopware Online Subsystem @ Authorization Configuration Endpoint || Configuration endpoint for the authorization server
 */

// Enums

// Interface
interface ClientTokenRegistrationInformation {
	appName: string,
	accessScopes: {
		datastore: { datastoreService: boolean | false, leaderboardService: boolean | false, assetStreamingService: boolean | false, } | boolean,
		net: { punchthroughService: boolean | false } | boolean
	}
}

// Constants
const router: Router = express.Router()
const clientTokenStorageAgent: MongoClient = new MongoClient(String(process.env.AUTHORIZATION_MONGO_CLIENT_TOKEN_STORAGE_URI))

// ENV Constants
const CLIENT_TOKEN_STORAGE_COLLECTION_NAME: string = String(process.env.AUTHORIZATION_MONGO_CLIENT_TOKEN_STORAGE_COLLECTION_NAME)

// Public Variables

// Private Variables
var _connectedToClientTokenStorageDB: boolean = true

// _init()
async function _init(): Promise<void> {
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
router.post("/new-client", (req, res) => {
	// Retrieve incoming data
	let incomingData: object | any = req.body

	// Check if we received an empty body
	if (Object.keys(incomingData).length === 0) { res.status(400).json({ code: 400, message: "Empty body" }); return; }

	// Store data
	let newRegistrationInfo: ClientTokenRegistrationInformation = {
		appName: incomingData.appName,
		accessScopes: {
			datastore: incomingData.accessScopes.datastore,
			net: incomingData.accessScopes.net,
		},
	}

	// Null checks
	if (objectNullCheck(newRegistrationInfo)) { res.status(400).json({ code: 400, message: "Invalid body" }); return; }

	// Check connection
	if (!_connectedToClientTokenStorageDB) { res.status(500).json({ code: 500, message: "Database Offline" }); return; }

	// Write data
	try {
		let clientTokenStorageDatabase: Db = clientTokenStorageAgent.db()
		let clientTokenStorageCollection: Collection = clientTokenStorageDatabase.collection(CLIENT_TOKEN_STORAGE_COLLECTION_NAME)
		let newClientTokenData: NewClientTokenData = generateNewClientToken()
		let writeData: object = {
			appName: newRegistrationInfo.appName,
			clientToken: newClientTokenData.clientToken,
			serverAccessToken: newClientTokenData.serverAccessToken,
			serverRefreshToken: newClientTokenData.serverRefreshToken,
			clientAccessScopes: newRegistrationInfo.accessScopes,
		}

		clientTokenStorageCollection.insertOne(writeData)
			.catch((error) => {
				err(`Database error while writing data to [${clientTokenStorageCollection.collectionName}@${clientTokenStorageDatabase.databaseName}] | ${error}`)
				res.status(500).json({ code: 500, message: "Database error" })
				return
			})
			.then(() => {
				log(`Successfully wrote data to [${clientTokenStorageCollection.collectionName}@${clientTokenStorageDatabase.databaseName}]`)
				res.status(200).json({ code: 200, message: "Success", data: { clientToken: newClientTokenData.clientToken } })
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