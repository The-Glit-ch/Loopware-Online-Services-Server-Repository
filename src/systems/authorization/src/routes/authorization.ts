// Imports
import { err, log, wrn } from '../../../../shared/logging-module/src/logging_module'
import { generateJWT } from '../../../../shared/authorization-module/src/authorization_module'
import express, { Router } from 'express'
import { Collection, Db, MongoClient } from 'mongodb'

// Docstring
/**
 * Loopware Online Subsystem @ Authorization Endpoint || This endpoint is used for clients to register, refresh, and logout.
 */

// Enums

// Interface

// Constants
const router: Router = express.Router()
const clientTokenStorageAgent: MongoClient = new MongoClient(String(process.env.AUTHORIZATION_MONGO_CLIENT_TOKEN_STORAGE_URI))
const liveTokenStorageAgent: MongoClient = new MongoClient(String(process.env.AUTHORIZATION_MONGO_LIVE_TOKEN_STORAGE_URI))

// ENV Constants
const TOKEN_EXPIRATION_TIME: string | undefined = process.env.AUTHORIZATION_TOKEN_EXPIRATION_TIME
const CLIENT_TOKEN_STORAGE_COLLECTION_NAME: string = String(process.env.AUTHORIZATION_MONGO_CLIENT_TOKEN_STORAGE_COLLECTION_NAME)
const LIVE_TOKEN_STORAGE_COLLECTION_NAME: string = String(process.env.AUTHORIZATION_MONGO_LIVE_TOKEN_STORAGE_COLLECTION_NAME)

// Public Variables

// Private Variables
var _connectedToClientTokenStorageDB: boolean = true
var _connectedToLiveTokenStorageDB: boolean = true

// _init()
async function _init(): Promise<void> {
	// Connect to Client Storage and Token Storage
	try {
		await clientTokenStorageAgent.connect()
		await liveTokenStorageAgent.connect()
		log(`Connection to Mongo@ClientTokenStorage && Mongo@LiveTokenStorage was successful`)
		_connectedToClientTokenStorageDB = true
		_connectedToLiveTokenStorageDB = true
	} catch (error) {
		wrn(`Connection to Mongo@ClientTokenStorage && Mongo@LiveTokenStorage was unsuccessful | ${error}`)
		_connectedToClientTokenStorageDB = false
		_connectedToLiveTokenStorageDB = false
	}
}

// Public Methods
router.post("/register", (req, res) => {
	// Retrieve client token
	let authorizationHeader: string | undefined = req.headers.authorization
	let clientToken: string | undefined = authorizationHeader?.split(" ")[1]

	// Client token provided?
	if (clientToken == undefined) { res.status(401).json({ code: 401, message: "Client token not provided" }); return; }

	// Check connection to database
	if (!_connectedToClientTokenStorageDB || !_connectedToLiveTokenStorageDB) { res.status(500).json({ code: 500, message: "Database Offline" }); return; }

	// Begin registration process
	try {
		// Lookup token
		let clientTokenStorageDatabase: Db = clientTokenStorageAgent.db()
		let clientTokenStorageCollection: Collection = clientTokenStorageDatabase.collection(CLIENT_TOKEN_STORAGE_COLLECTION_NAME)
		let clientTokenStorageFetchQuery: object = { clientToken: clientToken }
		let clientTokenStorageFetchQueryOptions: object = { projection: { serverAccessToken: 1, serverRefreshToken: 1, appName: 1, clientAccessScopes: 1 } }

		// Begin search
		clientTokenStorageCollection.findOne(clientTokenStorageFetchQuery, clientTokenStorageFetchQueryOptions)
			.catch((error: any) => {
				err(`Database error while fetching data from [${clientTokenStorageCollection.collectionName}@${clientTokenStorageDatabase.databaseName}] | ${error}`)
				res.status(500).json({ code: 500, message: "Database error" })
				return
			})
			.then((foundClientInfoObject: any) => {
				// Client token was not found
				if (!foundClientInfoObject) { res.status(401).json({ code: 401, message: "Invalid client token" }); return; }
				log(`Successfully fetched data from [${clientTokenStorageCollection.collectionName}@${clientTokenStorageDatabase.databaseName}]`)

				// Prepare data for JWT generation
				let appName: string = foundClientInfoObject.appName
				let serverAccessToken: string = foundClientInfoObject.serverAccessToken
				let serverRefreshToken: string = foundClientInfoObject.serverRefreshToken
				let clientAccessScopes: object = foundClientInfoObject.clientAccessScopes
				let payload: object = { appName: appName, clientToken: clientToken, clientAccessScopes: clientAccessScopes }

				// Generate a new access token
				generateJWT(payload, serverAccessToken, { expiresIn: TOKEN_EXPIRATION_TIME })
					.catch((error: any) => {
						err(`Error while generating access token | ${error}`)
						res.status(500).json({ code: 500, message: "Server error" })
						return
					})
					.then((newAccessToken: string) => {

						// Generate refresh token
						// We're going to use the same payload as the access token
						generateJWT(payload, serverRefreshToken)
							.catch((error: any) => {
								err(`Error while generating refresh token | ${error}`)
								res.status(500).json({ code: 500, message: "Server error" })
								return
							})
							.then((newRefreshToken: string) => {
								// Add refresh token to live token storage
								let liveTokenStorageDatabase: Db = liveTokenStorageAgent.db()
								let liveTokenStorageCollection: Collection = liveTokenStorageDatabase.collection(LIVE_TOKEN_STORAGE_COLLECTION_NAME)
								let writeData: object = { refreshToken: newRefreshToken }

								// Write data
								liveTokenStorageCollection.insertOne(writeData)
									.catch((error: any) => {
										err(`Database error while writing data to [${liveTokenStorageCollection.collectionName}@${liveTokenStorageDatabase.databaseName}] | ${error}`)
										res.status(500).json({ code: 500, message: "Database error" })
										return
									})
									.then(() => {
										log(`Successfully wrote data to [${liveTokenStorageCollection.collectionName}@${liveTokenStorageDatabase.databaseName}]`)
										res.status(200).json({ code: 200, message: "Success", data: { accessToken: newAccessToken, refreshToken: newRefreshToken } })
										return
									})
							})
					})
			})
	} catch (error) {
		err(`Fatal error occurred on "/register" endpoint | ${error}`)
		res.status(500).json({ code: 500, message: "Fatal error" })
		return
	}
})

router.post("/refresh", (req, res) => {
	// Retrieve client token and refresh token
	let authorizationHeader: string | undefined = req.headers.authorization
	let combinedTokens: Array<string> | undefined = authorizationHeader?.split(" ")[1].split(":")
	let clientToken: string | undefined = combinedTokens?.pop()
	let refreshToken: string | undefined = combinedTokens?.pop()

	// Client token and refresh token provided?
	if (refreshToken == undefined || clientToken == undefined) { res.status(401).json({ code: 401, message: "Refresh and/or client token not provided" }); return; }

	// Check connection to database
	if (!_connectedToClientTokenStorageDB || !_connectedToLiveTokenStorageDB) { res.status(500).json({ code: 500, message: "Database Offline" }); return; }

	// Begin refresh process
	try {
		// Lookup client token
		let clientTokenStorageDatabase: Db = clientTokenStorageAgent.db()
		let clientTokenStorageCollection: Collection = clientTokenStorageDatabase.collection(CLIENT_TOKEN_STORAGE_COLLECTION_NAME)
		let clientTokenStorageFetchQuery: object = { clientToken: clientToken }
		let clientTokenStorageFetchQueryOptions: object = { projection: { serverAccessToken: 1, appName: 1, clientAccessScopes: 1 } }

		clientTokenStorageCollection.findOne(clientTokenStorageFetchQuery, clientTokenStorageFetchQueryOptions)
			.catch((error: any) => {
				err(`Database error while fetching data from [${clientTokenStorageCollection.collectionName}@${clientTokenStorageDatabase.databaseName}] | ${error}`)
				res.status(500).json({ code: 500, message: "Database error" })
				return
			})
			.then((foundClientInfoObject: any) => {
				// Client token was not found
				if (!foundClientInfoObject) { res.status(401).json({ code: 401, message: "Invalid client token" }); return; }
				log(`Successfully fetched data from [${clientTokenStorageCollection.collectionName}@${clientTokenStorageDatabase.databaseName}]`)

				// Store data and prepare the payload
				let appName: string = foundClientInfoObject.appName
				let serverAccessToken: string = foundClientInfoObject.serverAccessToken
				let clientAccessScopes: object = foundClientInfoObject.clientAccessScopes
				let payload: object = { appName: appName, clientToken: clientToken, clientAccessScopes: clientAccessScopes }

				// Lookup refresh token
				// Putting it in its own try...catch block to better catch errors
				try {
					let liveTokenStorageDatabase: Db = liveTokenStorageAgent.db()
					let liveTokenStorageCollection: Collection = liveTokenStorageDatabase.collection(LIVE_TOKEN_STORAGE_COLLECTION_NAME)
					let liveTokenStorageFetchQuery: object = { refreshToken: refreshToken }
					let liveTokenStorageFetchQueryOptions: object = { projection: { refreshToken: 1 } }

					liveTokenStorageCollection.findOne(liveTokenStorageFetchQuery, liveTokenStorageFetchQueryOptions)
						.catch((error: any) => {
							err(`Database error while fetching data from [${liveTokenStorageCollection.collectionName}@${liveTokenStorageDatabase.databaseName}] | ${error}`)
							res.status(500).json({ code: 500, message: "Database error" })
							return
						})
						.then((foundLiveInfoObject: any) => {
							// Refresh token was not found
							if (!foundLiveInfoObject) { res.status(401).json({ code: 401, message: "Invalid refresh token" }); return; }
							log(`Successfully fetched data from [${liveTokenStorageCollection.collectionName}@${liveTokenStorageDatabase.databaseName}]`)

							// Generate a new access token
							generateJWT(payload, serverAccessToken, { expiresIn: TOKEN_EXPIRATION_TIME })
								.catch((error: any) => {
									err(`Error while generating access token | ${error}`)
									res.status(500).json({ code: 500, message: "Server error" })
									return
								})
								.then((newAccessToken: string) => {
									res.status(200).json({ code: 200, message: "Success", data: { accessToken: newAccessToken } })
								})
						})
				} catch (error) {
					err(`Fatal error occurred on "/refresh" endpoint | Live token lookup block | ${error}`)
					res.status(500).json({ code: 500, message: "Fatal error" })
					return
				}
			})
	} catch (error) {
		err(`Fatal error occurred on "/refresh" endpoint | Client token lookup block | ${error}`)
		res.status(500).json({ code: 500, message: "Fatal error" })
		return
	}
})

router.post("/logout", (req, res) => {
	// Retrieve client token and refresh token
	let authorizationHeader: string | undefined = req.headers.authorization
	let combinedTokens: Array<string> | undefined = authorizationHeader?.split(" ")[1].split(":")
	let clientToken: string | undefined = combinedTokens?.pop()
	let refreshToken: string | undefined = combinedTokens?.pop()

	// Client token and refresh token provided?
	if (refreshToken == undefined || clientToken == undefined) { res.status(401).json({ code: 401, message: "Refresh and/or client token not provided" }); return; }

	// Check connection to database
	if (!_connectedToClientTokenStorageDB || !_connectedToLiveTokenStorageDB) { res.status(500).json({ code: 500, message: "Database Offline" }); return; }

	// Begin logout process
	try {
		// Lookup client token
		let clientTokenStorageDatabase: Db = clientTokenStorageAgent.db()
		let clientTokenStorageCollection: Collection = clientTokenStorageDatabase.collection(CLIENT_TOKEN_STORAGE_COLLECTION_NAME)
		let clientTokenStorageFetchQuery: object = { clientToken: clientToken }

		clientTokenStorageCollection.findOne(clientTokenStorageFetchQuery)
			.catch((error: any) => {
				err(`Database error while fetching data from [${clientTokenStorageCollection.collectionName}@${clientTokenStorageDatabase.databaseName}] | ${error}`)
				res.status(500).json({ code: 500, message: "Database error" })
				return
			})
			.then((foundClientInfoObject: any) => {
				// Client token was not found
				if (!foundClientInfoObject) { res.status(401).json({ code: 401, message: "Invalid client token" }); return; }
				log(`Successfully fetched data from [${clientTokenStorageCollection.collectionName}@${clientTokenStorageDatabase.databaseName}]`)

				// Lookup refresh token
				// Putting it in its own try...catch block to better catch errors
				try {
					let liveTokenStorageDatabase: Db = liveTokenStorageAgent.db()
					let liveTokenStorageCollection: Collection = liveTokenStorageDatabase.collection(LIVE_TOKEN_STORAGE_COLLECTION_NAME)
					let liveTokenStorageFetchQuery: object = { refreshToken: refreshToken }

					liveTokenStorageCollection.findOneAndDelete(liveTokenStorageFetchQuery)
						.catch((error: any) => {
							err(`Database error while finding and deleting data from [${liveTokenStorageCollection.collectionName}@${liveTokenStorageDatabase.databaseName}] | ${error}`)
							res.status(500).json({ code: 500, message: "Database error" })
							return
						})
						.then((result: any) => {
							if (!result.value) { res.status(401).json({ code: 401, message: "Invalid refresh token" }); return; }
							log(`Successfully deleted data from [${liveTokenStorageCollection.collectionName}@${liveTokenStorageDatabase.databaseName}]`)

							res.status(200).json({ code: 200, message: "Success" })
							return
						})
				} catch (error) {
					err(`Fatal error occurred on "/logout" endpoint | Live token lookup block | ${error}`)
					res.status(500).json({ code: 500, message: "Fatal error" })
					return
				}
			})
	} catch (error) {
		err(`Fatal error occurred on "/logout" endpoint | Client token lookup block | ${error}`)
		res.status(500).json({ code: 500, message: "Fatal error" })
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

liveTokenStorageAgent.on('serverHeartbeatSucceeded', () => {
	if (!_connectedToLiveTokenStorageDB) { log(`Reconnected to MongoDB@LiveTokenStorage`); _connectedToLiveTokenStorageDB = true; }
})

liveTokenStorageAgent.on('serverHeartbeatFailed', () => {
	wrn(`Connection to MongoDB@LiveTokenStorage was dropped | Attempting reconnection`)
	if (_connectedToLiveTokenStorageDB == true) { _retryConnection(liveTokenStorageAgent) }
	_connectedToLiveTokenStorageDB = false
})

_init()
module.exports = router