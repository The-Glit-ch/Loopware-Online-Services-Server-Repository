// Imports
import express from 'express'
import { Collection, Db, MongoClient } from 'mongodb'
import { generateJWT, decodeJWT } from '../../../../shared/authorization-module/src/authorization_module'
import { err, log, wrn } from '../../../../shared/logging-module/src/logging_module'

// Docstring
/**
 * Loopware Online Subsystem @ Authorization Endpoint || Exposes endpoints that allow for clients to register via a client token
 * Client tokens are generated via the dashboard
 */

// Enums

// Interface

// Constants
const router = express.Router()
const clientTokenStorageAgent: MongoClient = new MongoClient(String(process.env.AUTH_MONGO_CLIENT_TOKEN_STORAGE_URI))
const liveTokenStorageAgent: MongoClient = new MongoClient(String(process.env.AUTH_MONGO_LIVE_TOKEN_STORAGE_URI))

// ENV Constants
const TOKEN_EXP_TIME: string | undefined = process.env.AUTH_TOKEN_EXP_TIME
const CLIENT_TOKEN_STORAGE_COLLECTION_NAME: string = String(process.env.AUTH_MONGO_CLIENT_TOKEN_STORAGE_COLLECTION_NAME)
const LIVE_TOKEN_STORAGE_COLLECTION_NAME: string = String(process.env.AUTH_MONGO_LIVE_TOKEN_STORAGE_COLLECTION_NAME)

// Public Variables

// Private Variables
var _connectedToClientTokenStorageDB: boolean = true
var _connectedToLiveTokenStorageDB: boolean = true

// _init()
async function _init():Promise<void> {
	// Connect to Client Storage and Token Storage
	try {
		await clientTokenStorageAgent.connect()
		await liveTokenStorageAgent.connect()
		log(`Connection to Mongo@ClientTokenStorage && Mongo@LiveTokenStorage was successful`)
		_connectedToClientTokenStorageDB = true
		_connectedToLiveTokenStorageDB = true
	}catch (error){
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
	if (clientToken == undefined){ res.status(401).json({code: 401, message: "Client token not provided"}); return; }

	// Check connection
	if (!_connectedToClientTokenStorageDB || !_connectedToLiveTokenStorageDB){ res.status(500).json({code: 500, message: "Database Offline"}); return; }

	// Lookup token
	try{
		let clientTokenStorageDatabase: Db = clientTokenStorageAgent.db()
		let clientTokenStorageCollection: Collection = clientTokenStorageDatabase.collection(CLIENT_TOKEN_STORAGE_COLLECTION_NAME)
		let clientTokenStorageFetchQuery: object = {clientToken: clientToken}
		let clientTokenStorageFetchQueryOptions: object = {projection: {serverAccessToken: 1, serverRefreshToken: 1, appName: 1}}
		
		// Begin search
		clientTokenStorageCollection.findOne(clientTokenStorageFetchQuery, clientTokenStorageFetchQueryOptions)
			.catch((error) => {
				// Look-up error
				err(`Database error while fetching data from [${clientTokenStorageCollection.collectionName}@${clientTokenStorageDatabase.databaseName}] | ${error}`)
				res.status(500).json({code: 500, message: "Database error"})
				return
			})
			.then((foundClientToken) => {
				if (!foundClientToken){ res.status(401).json({code: 401, message: "Invalid client token"}); return; }
				log(`Successfully fetched data from [${clientTokenStorageCollection.collectionName}@${clientTokenStorageDatabase.databaseName}]`)
				
				/**
				 * INFO: Since we did find the clientToken in client token storage there
				 * is really no *need* to compare it against the "serverAccessToken"
				 * This could probably be a massive security flaw but we will see 
				 * once this is in PROD
				 */

				// Generate new JWT
				let serverAccessToken: string = foundClientToken.serverAccessToken
				let serverRefreshToken: string = foundClientToken.serverRefreshToken
				let appName: string = foundClientToken.appName
				let payload: object = {clientToken: clientToken, appName: appName}

				// Generate access token
				generateJWT(payload, serverAccessToken, {expiresIn: TOKEN_EXP_TIME})
					.catch((error) => {
						err(`Error while generating access token | ${error}`)
						res.status(500).json({code: 500, message: "Server error while generating access token"})
						return
					})
					.then((accessToken: string) => {
						// Generate refresh token
						generateJWT(payload, serverRefreshToken)
							.catch((error) => {
								err(`Error while generating refresh token | ${error}`)
								res.status(500).json({code: 500, message: "Server error while generating refresh token"})
								return
							}).then((refreshToken: string) => {
								// Add to token storage
								let liveTokenStorageDatabase: Db = liveTokenStorageAgent.db()
								let liveTokenStorageCollection: Collection = liveTokenStorageDatabase.collection(LIVE_TOKEN_STORAGE_COLLECTION_NAME)
								let writeData: object = { refreshToken: refreshToken }
								
								// Write data
								liveTokenStorageCollection.insertOne(writeData)
									.catch((error) => {
										err(`Database error while writing data to [${liveTokenStorageCollection.collectionName}@${liveTokenStorageDatabase.databaseName}] | ${error}`)
										res.status(500).json({code: 500, message: "Error writing data"})
										return
									})
									.then(() => {
										log(`Successfully wrote data to [${liveTokenStorageCollection.collectionName}@${liveTokenStorageDatabase.databaseName}]`)
										res.status(200).json({code: 200, message: "Success", data: {accessToken: accessToken, refreshToken: refreshToken}})
										return
									})

							})
					})
			})
	}catch (error){
		err(`Fatal error occurred on "/register" endpoint | ${error}`)
		res.status(500).json({code: 500, message: "Fatal error"})
		return
	}
})

router.post("/refresh", (req, res) => {
	// Retrieve refresh and client token
	let authorizationHeader: string | undefined = req.headers.authorization
	let combinedTokens: Array<string> | undefined = authorizationHeader?.split(" ")[1].split(":")
	let clientToken: string | undefined = combinedTokens?.pop()
	let refreshToken: string | undefined = combinedTokens?.pop()

	// Refresh and client token provided?
	if (refreshToken == undefined || clientToken == undefined ){ res.status(401).json({code: 401, message: "Refresh and client token not provided"}); return; }

	// Check connection
	if (!_connectedToLiveTokenStorageDB){ res.status(500).json({code: 500, message: "Database Offline"}); return; }

	// Look-up the client token first, then check the refresh token
	try{
		let clientTokenStorageDatabase: Db = clientTokenStorageAgent.db()
		let clientTokenStorageCollection: Collection = clientTokenStorageDatabase.collection(CLIENT_TOKEN_STORAGE_COLLECTION_NAME)
		let clientTokenStorageFetchQuery: object = {clientToken: clientToken}
		let clientTokenStorageFetchQueryOptions: object = {projection: {serverAccessToken: 1, clientToken: 1, appName: 1}}

		clientTokenStorageCollection.findOne(clientTokenStorageFetchQuery, clientTokenStorageFetchQueryOptions)
			.catch((error) => {
				// Look-up error
				err(`Database error while fetching data from [${clientTokenStorageCollection.collectionName}@${clientTokenStorageDatabase.databaseName}] | ${error}`)
				res.status(500).json({code: 500, message: "Database error"})
				return
			})
			.then((foundTokens) => {
				if (!foundTokens){ res.status(401).json({code: 401, message: "Invalid client token"}); return; }
				log(`Successfully fetched data from [${clientTokenStorageCollection.collectionName}@${clientTokenStorageDatabase.databaseName}]`)

				// Store found token data
				let storedServerAccessToken: string = foundTokens.serverAccessToken
				let storedClientToken: string = foundTokens.clientToken
				let storedAppName: string = foundTokens.appName
				
				// Look-up the refresh token on the live token storage database
				try{
					let liveTokenStorageDatabase: Db = liveTokenStorageAgent.db()
					let liveTokenStorageCollection: Collection = liveTokenStorageDatabase.collection(LIVE_TOKEN_STORAGE_COLLECTION_NAME)
					let liveTokenStorageFetchQuery: object = {refreshToken: refreshToken}
					let liveTokenStorageFetchQueryOptions: object = {refreshToken: 1}
			
					liveTokenStorageCollection.findOne(liveTokenStorageFetchQuery, liveTokenStorageFetchQueryOptions)
						.catch((error) => {
							// Look-up error
							err(`Database error while fetching data from [${liveTokenStorageCollection.collectionName}@${liveTokenStorageDatabase.databaseName}] | ${error}`)
							res.status(500).json({code: 500, message: "Database error"})
							return
						})
						.then((foundRefreshToken) => {
							if (!foundRefreshToken){ res.status(401).json({code: 401, message: "Invalid refresh token"}); return; }
							log(`Successfully fetched data from [${liveTokenStorageCollection.collectionName}@${liveTokenStorageDatabase.databaseName}]`)
							
							/**
							 * INFO: Same issue as the clientToken one
							 * Do we decode the token and compare it with the clientToken
							 * even though you NEED a correct refresh/clientToken pair to even reach here
							 */
							
							// Set payload
							let payload: object = {clientToken: storedClientToken, appName: storedAppName}
							
							// Generate a new accessToken
							generateJWT(payload, storedServerAccessToken, {expiresIn: TOKEN_EXP_TIME})
								.catch((error) => {
									err(`Error while generating access token | ${error}`)
									res.status(500).json({code: 500, message: "Server error while generating access token"})
									return
								})
								.then((newToken) => {
									// Return token
									res.status(200).json({code: 200, message: "Success", data: {accessToken: newToken}})
									return
								})
			
						})
			
				}catch (error){
					err(`Fatal error occurred on "/refresh" endpoint | Live token lookup block | ${error}`)
					res.status(500).json({code: 500, message: "Fatal error"})
					return
				}
			
			})
	}catch (error){
		err(`Fatal error occurred on "/refresh" endpoint | Client token lookup block | ${error}`)
		res.status(500).json({code: 500, message: "Fatal error"})
		return
	}

})

router.post("/logout", (req, res) => {
	// Retrieve refresh and client token
	let authorizationHeader: string | undefined = req.headers.authorization
	let combinedTokens: Array<string> | undefined = authorizationHeader?.split(" ")[1].split(":")
	let clientToken: string | undefined = combinedTokens?.pop()
	let refreshToken: string | undefined = combinedTokens?.pop()

	// Refresh and client token provided?
	if (refreshToken == undefined || clientToken == undefined ){ res.status(401).json({code: 401, message: "Refresh and client token not provided"}); return; }

	// Check connection
	if (!_connectedToLiveTokenStorageDB){ res.status(500).json({code: 500, message: "Database Offline"}); return; }

	// Look-up the client token first, then check the refresh token, and finally logout
	try{
		let clientTokenStorageDatabase: Db = clientTokenStorageAgent.db()
		let clientTokenStorageCollection: Collection = clientTokenStorageDatabase.collection(CLIENT_TOKEN_STORAGE_COLLECTION_NAME)
		let clientTokenStorageFetchQuery: object = {clientToken: clientToken}

		clientTokenStorageCollection.findOne(clientTokenStorageFetchQuery)
			.catch((error) => {
				// Look-up error
				err(`Database error while fetching data from [${clientTokenStorageCollection.collectionName}@${clientTokenStorageDatabase.databaseName}] | ${error}`)
				res.status(500).json({code: 500, message: "Database error"})
				return
			})
			.then((foundClientToken) => {
				if (!foundClientToken){ res.status(401).json({code: 401, message: "Invalid client token"}); return; }
				log(`Successfully fetched data from [${clientTokenStorageCollection.collectionName}@${clientTokenStorageDatabase.databaseName}]`)

				// Check refresh token
				try{
					let liveTokenStorageDatabase: Db = liveTokenStorageAgent.db()
					let liveTokenStorageCollection: Collection = liveTokenStorageDatabase.collection(LIVE_TOKEN_STORAGE_COLLECTION_NAME)
					let liveTokenStorageFetchQuery: object = {refreshToken: refreshToken}

					liveTokenStorageCollection.findOne(liveTokenStorageFetchQuery)
						.catch((error) => {
							// Look-up error
							err(`Database error while fetching data from [${liveTokenStorageCollection.collectionName}@${liveTokenStorageDatabase.databaseName}] | ${error}`)
							res.status(500).json({code: 500, message: "Database error"})
							return
						})
						.then((foundRefreshToken) => {
							if (!foundRefreshToken){ res.status(401).json({code: 401, message: "Invalid refresh token"}); return; }
							log(`Successfully fetched data from [${liveTokenStorageCollection.collectionName}@${liveTokenStorageDatabase.databaseName}]`)
							
							/**
							 * INFO: Same dilemma, you get the idea
							 */

							// Remove token
							liveTokenStorageCollection.deleteOne(liveTokenStorageFetchQuery)
								.catch((error) => {
									// Deletion error
									err(`Database error while deleting data from [${liveTokenStorageCollection.collectionName}@${liveTokenStorageDatabase.databaseName}] | ${error}`)
									res.status(500).json({code: 500, message: "Database error"})
									return
								})
								.then(() => {
									log(`Successfully deleted data from [${liveTokenStorageCollection.collectionName}@${liveTokenStorageDatabase.databaseName}]`)
									res.status(200).json({code: 200, message: "Successfully logged out"})
								})
						})

				}catch (error){
					err(`Fatal error occurred on "/logout" endpoint | Live token lookup block | ${error}`)
					res.status(500).json({code: 500, message: "Fatal error"})
					return
				}
			})

	}catch (error){
		err(`Fatal error occurred on "/logout" endpoint | Client token lookup block | ${error}`)
		res.status(500).json({code: 500, message: "Fatal error"})
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

liveTokenStorageAgent.on('serverHeartbeatSucceeded', () => {
	if (!_connectedToLiveTokenStorageDB){ log(`Reconnected to MongoDB@LiveTokenStorage`); _connectedToLiveTokenStorageDB = true; }
})

liveTokenStorageAgent.on('serverHeartbeatFailed', () => {
	wrn(`Connection to MongoDB@LiveTokenStorage was dropped | Attempting reconnection`)
	if (_connectedToLiveTokenStorageDB == true){ _retryConnection(liveTokenStorageAgent) }
	_connectedToLiveTokenStorageDB = false
})

_init()
module.exports = router