// Imports
import express from 'express'
import { Collection, Db, MongoClient } from 'mongodb'
import { decodeJWT } from '../../../../shared/authorization-module/src/authorization_module'
import { log, wrn, err } from '../../../../shared/logging-module/src/logging_module'

// Docstring
/**
 * Loopware Online Subsystem @ Authorization Module Access Endpoint || Allows for the authorization
 * module to communicate with the Authorization service
 * 
 * TODO: Security + Cleanup
 */

// Enums

// Interface

// Constants
const router = express.Router()
const clientTokenStorageAgent: MongoClient = new MongoClient(String(process.env.AUTH_MONGO_CLIENT_TOKEN_STORAGE_URI))

// ENV Constants
const CLIENT_TOKEN_STORAGE_COLLECTION_NAME: string = String(process.env.AUTH_MONGO_CLIENT_TOKEN_STORAGE_COLLECTION_NAME)

// Public Variables

// Private Variables
var _connectedToClientTokenStorageDB: boolean = true

// _init()
async function _init(): Promise<void> {
	// Only allow local host
	router.use((req, res, next) => {
		if (req.ip == "127.0.0.1"){ next(); return; }

		res.status(403).json({code: 403, message: "Forbidden"})
		return
	})

	// Connect to client storage
	try{
		await clientTokenStorageAgent.connect()
		log(`Connection to Mongo@ClientTokenStorage was successfully`)
		_connectedToClientTokenStorageDB = true
	}catch (error){
		wrn(`Connection to Mongo@ClientTokenStorage was unsuccessful | ${error}`)
		_connectedToClientTokenStorageDB = false
	}
}

// Public Methods
router.get("/validate-access-token", (req, res) => {
	// Retrieve incoming data
	let incomingBody: object | any = req.body
	let accessToken = incomingBody.tokens.accessToken
	let clientToken = incomingBody.tokens.clientToken

	// Check if we have data
	if (accessToken == undefined || clientToken == undefined){ res.status(400).json({code: 400, message: "Tokens not supplied"}); return; }

	// Lookup the client token
	try{
		let clientTokenStorageDatabase: Db = clientTokenStorageAgent.db()
		let clientTokenStorageCollection: Collection = clientTokenStorageDatabase.collection(CLIENT_TOKEN_STORAGE_COLLECTION_NAME)
		let clientTokenStorageFetchQuery: object = {clientToken: clientToken}
		let clientTokenStorageFetchQueryOptions: object = {projection: {serverAccessToken: 1, appName: 1}}

		clientTokenStorageCollection.findOne(clientTokenStorageFetchQuery, clientTokenStorageFetchQueryOptions)
			.catch((error) => {
				// Look-up error
				err(`Database error while fetching data from [${clientTokenStorageCollection.collectionName}@${clientTokenStorageDatabase.databaseName}]| | ${error}`)
				res.status(500).json({code: 500, message: "Database error", data: {isValid: false}})
				return
			})
			.then((foundClientToken) => {
				if (!foundClientToken){ res.status(401).json({code: 401, message: "Invalid client token", data: {isValid: false}}); return; }
				log(`Successfully fetched data from [${clientTokenStorageCollection.collectionName}@${clientTokenStorageDatabase.databaseName}]`)

				// Save return data
				let serverAccessToken: string = foundClientToken.serverAccessToken
				let appName: string = foundClientToken.appName

				// Compare access token against the server access token
				decodeJWT(accessToken, serverAccessToken)
					.catch((_error) => {
						res.status(401).json({code: 401, message: "Invalid access token", data: {isValid: false}})
						return
					})
					.then((_decodedToken) => {
						if (!_decodedToken){ return; }
						res.status(200).json({code: 200, message: "Success", data: {isValid: true, appName: appName}})
						return
					})
			})

	}catch (error){
		err(`Fatal error occurred on "/validate-access-token" endpoint |${error}`)
		res.status(500).json({code: 500, message: "Fatal error", data: {isValid: false}})
		return
	}
})

// Private Methods
function _retryConnection(client: MongoClient): void{
	let count: number = 0
	let interval: NodeJS.Timer = setInterval(async () => { log(`Retrying...(${count})`); count++; await client.connect(); }, 2000)
	client.on('serverHeartbeatSucceeded', () => { clearInterval(interval) })
}

// Run
clientTokenStorageAgent.on('serverHeartbeatSucceeded', () => {
	if (!_connectedToClientTokenStorageDB){ log(`Reconnected to MongoDB@ClientTokenStorage`); _connectedToClientTokenStorageDB = true; }
})

clientTokenStorageAgent.on('serverHeartbeatFailed', () => {
	wrn(`Connection to MongoDB@ClientTokenStorage was dropped | Attempting reconnection`)
	if (_connectedToClientTokenStorageDB == true){ _retryConnection(clientTokenStorageAgent) }
	_connectedToClientTokenStorageDB = false
})

_init()
module.exports = router