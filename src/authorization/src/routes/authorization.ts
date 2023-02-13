// Imports
import express from 'express'
import { Collection, Db, MongoClient } from 'mongodb'
import { generateJWT, decodeJWT } from '../../../../shared/authorization-module/src/authorization_module'
import { err, log, wrn } from '../../../../shared/logging-module/src/logging_module'

// Docstring
/**
 * Loopware Online Subsystem @ /auth Endpoint || Exposes endpoints that allow for clients to register via a client token
 */

// Enums

// Interface

// Constants
const router = express.Router()
const clientTokenStorageAgent: MongoClient = new MongoClient(String(process.env.AUTH_MONGO_CLIENT_TOKEN_STORAGE_URI))
const liveTokenStorageAgent: MongoClient = new MongoClient(String(process.env.AUTH_MONGO_LIVE_TOKEN_STORAGE_URI))
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
		let clientTokenStorageFetchQuery: Object = {clientToken: clientToken}
		let clientTokenStorageFetchQueryOptions: Object = {projection: {serverAccessToken: 1, serverRefreshToken: 1}}
		
		// Begin search
		clientTokenStorageCollection.findOne(clientTokenStorageFetchQuery, clientTokenStorageFetchQueryOptions)
			.catch((error) => {
				// Look-up error
				err(`Database error while fetching data from [${clientTokenStorageCollection.collectionName}@${clientTokenStorageDatabase.databaseName}] | ${error}`)
				res.status(500).json({code: 500, message: "Error while looking up client token"})
				return
			})
			.then((foundClientToken) => {
				if (!foundClientToken){ res.status(401).json({code: 401, message: "Invalid client token"}); return }
				log(`Successfully fetched data from [${clientTokenStorageCollection.collectionName}@${clientTokenStorageDatabase.databaseName}]`)
				
				// No need to validate token against server access token since well
				// the token is there..should I still validate?

				// Generate new JWT
				let serverAccessToken: string = foundClientToken.serverAccessToken
				let serverRefreshToken: string = foundClientToken.serverRefreshToken
				let appName: string = foundClientToken.appName
				let payload: Object = {clientToken: clientToken, appName: appName}

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
	let combinedTokens: Array<string> | undefined = authorizationHeader?.split(" ")[1].split("+/+")
	let clientToken: string | undefined = combinedTokens?.pop()
	let refreshToken: string | undefined = combinedTokens?.pop()

	// Refresh and client token provided?
	if (refreshToken == undefined || clientToken == undefined ){ res.status(401).json({code: 401, message: "Refresh and client token not provided"})}

	// Check connection
	if (!_connectedToLiveTokenStorageDB){ res.status(500).json({code: 500, message: "Database Offline"}); return; }

	// Lookup client token
	try{
		let clientTokenStorageDatabase: Db = clientTokenStorageAgent.db()
		let clientTokenStorageCollection: Collection = clientTokenStorageDatabase.collection(CLIENT_TOKEN_STORAGE_COLLECTION_NAME)
		let clientTokenStorageFetchQuery: Object = { clientToken: clientToken }
		let clientTokenStorageFetchQueryOptions: Object = { projection: {serverRefreshToken: 1} }

		clientTokenStorageCollection.findOne(clientTokenStorageFetchQuery, clientTokenStorageFetchQueryOptions)
			.catch((error) => {
				
			})
	}catch (error){

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
	if (!_connectedToClientTokenStorageDB){ log(`Reconnected to MongoDB@ClientStorage`); _connectedToClientTokenStorageDB = true; }
})

clientTokenStorageAgent.on('serverHeartbeatFailed', () => {
	wrn(`Connection to MongoDB@ClientStorage was dropped | Attempting reconnection`)
	if (_connectedToClientTokenStorageDB == true){ _retryConnection(clientTokenStorageAgent) }
	_connectedToClientTokenStorageDB = false
})

liveTokenStorageAgent.on('serverHeartbeatSucceeded', () => {
	if (!_connectedToLiveTokenStorageDB){ log(`Reconnected to MongoDB@TokenStorage`); _connectedToLiveTokenStorageDB = true; }
})

liveTokenStorageAgent.on('serverHeartbeatFailed', () => {
	wrn(`Connection to MongoDB@TokenStorage was dropped | Attempting reconnection`)
	if (_connectedToLiveTokenStorageDB == true){ _retryConnection(liveTokenStorageAgent) }
	_connectedToLiveTokenStorageDB = false
})

_init()
module.exports = router







/**
 * (POST) - /refresh || Authorization: Refresh Token
 * Refreshes the access token
 * Returns a new access token and the time it expires in
 */
// router.post("/refresh", (req, res) => {
// 	let authorizationHeader: string | undefined = req.headers.authorization
// 	let refreshToken: string | undefined = authorizationHeader?.split(" ")[1]
// 	let serverRefreshToken: string | undefined = process.env.SERVER_REFRESH_TOKEN
// 	let serverAccessToken: string | undefined = process.env.SERVER_ACCESS_TOKEN

// 	// Refresh token provided?
// 	if (refreshToken == undefined){ res.status(401).json({code: 401, message: "Refresh token not provided"}); return; }
	
// 	// Server access/refresh token available?
// 	if (serverAccessToken == undefined || serverRefreshToken == undefined){ res.status(500).json({code: 500, message: "Server token returned undefined"}); return; }

// 	// Validate client
// 	verifyAndDecodeJWT(refreshToken, serverRefreshToken)
// 		.catch((error) => {
// 			err(`Error while decoding refresh token | ${error}`)
// 			res.status(401).json({code: 401, message: "Invalid token"})
// 			return;
// 		})
// 		.then((data) => {
// 			// Validate client token
// 			if (!data){ return; }
// 			if(validateClientToken(data.token, String(serverAccessToken))){
// 				generateJWT({token: data.token}, String(serverAccessToken), {expiresIn: TOKEN_EXP_TIME})
// 					.catch((error) => {
// 						err(`Error while generating access token | ${error}`)
// 						res.status(500).json({code: 500, message: "Server error while generating access token"})
// 						return;
// 					})
// 					.then((token) => {
// 						// Return new access token
// 						res.status(200).json({code: 200, message: {access_token: token, expires_in: TOKEN_EXP_TIME}})
// 						return;
// 					})
// 			}else{
// 				// Return 401 if invalid client token + JWT combo
// 				res.status(401).json({code: 401, message: "Invalid client token"})
// 				return;
// 			}
// 		})
// })

/**
 * (POST) - /logout || Authorization: Refresh Token
 * Deregisters a client by revoking their refresh token 
 */
// router.post("/logout", (req, res) => {
// 	let authorizationHeader: string | undefined = req.headers.authorization
// 	let refreshToken: string | undefined = authorizationHeader?.split(" ")[1]
// 	let serverRefreshToken: string | undefined = process.env.SERVER_REFRESH_TOKEN
// 	let serverAccessToken: string | undefined = process.env.SERVER_ACCESS_TOKEN

// 	// Refresh token provided?
// 	if (refreshToken == undefined){ res.status(401).json({code: 401, message: "Refresh token not provided"}); return; }

// 	// Server access/refresh token available?
// 	if (serverAccessToken == undefined || serverRefreshToken == undefined){ res.status(500).json({code: 500, message: "Server token returned undefined"}); return; }

// 	// Validate client
// 	verifyAndDecodeJWT(refreshToken, serverRefreshToken)
// 		.catch((error) => {
// 			err(`Error while decoding refresh token | ${error}`)
// 			res.status(401).json({code: 401, message: "Invalid token"})
// 			return;
// 		})
// 		.then((data) => {
// 			// Validate client token
// 			if (validateClientToken(data.token, String(serverAccessToken))){
// 				// Fetch token
// 				let tokenIndex: number = tokenStorage.indexOf(String(refreshToken))
// 				// Check index of token
// 				if (tokenIndex == -1){ res.status(404).json({code: 404, message: "Already logged out"}); return; }
// 				// Remove the token
// 				tokenStorage.splice(tokenIndex, 1)

// 				res.status(200).json({code: 200, message: "Successful logout"})
// 				return;
// 			}else{
// 				res.status(401).json({code: 401, message: "Invalid client token"})
// 				return;
// 			}
// 		})
// })