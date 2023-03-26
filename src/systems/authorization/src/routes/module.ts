// Imports
import { log, wrn, err } from '../../../../shared/logging-module/src/logging_module'
import { decodeJWT } from '../../../../shared/authorization-module/src/authorization_module'
import { objectNullCheck } from '../../../../shared/general-utility-module/src/general_utility_module'
import express, { Router } from 'express'
import { Collection, Db, MongoClient } from 'mongodb'

// Docstring
/**
 * Loopware Online Subsystem @ Authorization Module Access Endpoint || Allows for the authorization
 * module to communicate with the Authorization service
 */

// Enums

// Interface

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
	// Only allow local host
	router.use((req, res, next) => {
		if (req.ip != "127.0.0.1") { res.status(403).json({ code: 403, message: "Forbidden" }); return; }
		next()
	})

	// Connect to client storage
	try {
		await clientTokenStorageAgent.connect()
		log(`Connection to Mongo@ClientTokenStorage was successfully`)
		_connectedToClientTokenStorageDB = true
	} catch (error) {
		wrn(`Connection to Mongo@ClientTokenStorage was unsuccessful | ${error}`)
		_connectedToClientTokenStorageDB = false
	}
}

// Public Methods
router.get("/validate-access-token", (req, res) => {
	// Retrieve data
	let incomingData: object | any = req.body

	// Check if we received an empty body
	if (Object.keys(incomingData).length === 0) { res.status(400).json({ code: 400, message: "Empty body" }); return; }

	// Store data
	let newValidationData: object | any = {
		clientToken: incomingData.clientToken,
		accessToken: incomingData.accessToken,
	}

	// Null checks
	if (objectNullCheck(newValidationData)) { res.status(400).json({ code: 400, message: "Invalid body" }); return; }

	// Check connection to database
	if (!_connectedToClientTokenStorageDB) { res.status(500).json({ code: 500, message: "Database Offline" }); return; }

	// Start the validation process
	try {
		let clientTokenStorageDatabase: Db = clientTokenStorageAgent.db()
		let clientTokenStorageCollection: Collection = clientTokenStorageDatabase.collection(CLIENT_TOKEN_STORAGE_COLLECTION_NAME)
		let clientTokenStorageFetchQuery: object = { clientToken: newValidationData.clientToken }
		let clientTokenStorageFetchQueryOptions: object = { projection: { serverAccessToken: 1 } }

		clientTokenStorageCollection.findOne(clientTokenStorageFetchQuery, clientTokenStorageFetchQueryOptions)
			.catch((error) => {
				err(`Database error while fetching data from [${clientTokenStorageCollection.collectionName}@${clientTokenStorageDatabase.databaseName}] | ${error}`)
				res.status(500).json({ code: 500, message: "Database error", data: { isValid: false } })
				return
			})
			.then((foundClientInfoObject) => {
				if (!foundClientInfoObject) { res.status(401).json({ code: 401, message: "Invalid client token", data: { isValid: false } }); return; }
				log(`Successfully fetched data from [${clientTokenStorageCollection.collectionName}@${clientTokenStorageDatabase.databaseName}]`)

				// Compare access token against the server access token
				decodeJWT(newValidationData.accessToken, foundClientInfoObject.serverAccessToken)
					.catch((_error) => {
						res.status(401).json({ code: 401, message: "Invalid access token", data: { isValid: false } })
						return
					})
					.then((decodedTokenData: any) => {
						if (!decodedTokenData) { return; }
						res.status(200).json({ code: 200, message: "Success", data: { isValid: true, appName: decodedTokenData.appName, clientAccessScopes: decodedTokenData.clientAccessScopes } })
						return
					})
			})
	} catch (error) {
		err(`Fatal error occurred on "/validate-access-token" endpoint |${error}`)
		res.status(500).json({ code: 500, message: "Fatal error", data: { isValid: false } })
		return
	}
})

// Private Methods
function _retryConnection(client: MongoClient): void {
	let count: number = 0
	let interval: NodeJS.Timer = setInterval(async () => { log(`Retrying...(${count})`); count++; await client.connect(); }, 2000)
	client.on('serverHeartbeatSucceeded', () => { clearInterval(interval) })
}

// Run
clientTokenStorageAgent.on('serverHeartbeatSucceeded', () => {
	if (!_connectedToClientTokenStorageDB) { log(`Reconnected to MongoDB@ClientTokenStorage`); _connectedToClientTokenStorageDB = true; }
})

clientTokenStorageAgent.on('serverHeartbeatFailed', () => {
	wrn(`Connection to MongoDB@ClientTokenStorage was dropped | Attempting reconnection`)
	if (_connectedToClientTokenStorageDB == true) { _retryConnection(clientTokenStorageAgent) }
	_connectedToClientTokenStorageDB = false
})

_init()
module.exports = router