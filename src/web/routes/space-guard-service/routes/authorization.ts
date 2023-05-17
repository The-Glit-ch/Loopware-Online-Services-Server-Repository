// Imports
import { Route, RouteModules } from '../../../../common/classes/route';
import { LossUtilityModule } from '../../../../modules/utility_module/module';
import { LossLoggingModule } from '../../../../modules/logging_module/module';
import { LossSecurityModule } from '../../../../modules/security_module/module';
import { MongoConnectionInformation } from '../../../../common/interfaces/mongo_connection_information';

import { Express, Router, Request, Response } from 'express';
import { Collection, Document, MongoClient, WithId, ModifyResult } from 'mongodb';

// Docstring
/**
 * Loopware Online Subsystem @ Authorization Endpoint
 * Handles all incoming authorization action requests
 */

// Enums

// Interfaces

// Classes

// Constants

// Public Variables

// Private Variables
let _expressAppReference: Express
let _lossLoggingModule: LossLoggingModule
let _lossUtilityModule: LossUtilityModule
let _lossSecurityModule: LossSecurityModule
let _tokenExpirationTime: string
let _liveTokenStorageCollectionName: string
let _clientTokenStorageCollectionName: string

// _init()

// Public Methods
/**
 * `POST /authorize-user`
 * @description Authorizes a user with Loss: Space Guard
 * @requires Client Token
 * @param { Request } req - The request object 
 * @param { Response } res - The response object 
 * @returns { Promise<void> } void
 */
async function authorizeUser(req: Request, res: Response): Promise<void> {
	// Retrieve authorization header
	const authorizationHeader: string | undefined = req.headers.authorization

	// Check if the authorization header is empty
	if (!authorizationHeader) { res.status(401).json({ code: 401, message: "Empty authorization header", }); return; }

	// Split the header
	const clientToken: string | Array<string> = await _lossUtilityModule.returnToken(authorizationHeader)

	// Check if a client token was supplied
	if (!clientToken) { res.status(401).json({ code: 401, message: "Client token not supplied", }); return; }

	// Retrieve database references
	const clientTokenStorageConnectionInfo: MongoConnectionInformation = _expressAppReference.get('LOSS_DATABASE_CLIENTTOKENSTORAGE')
	const liveTokenStorageConnectionInfo: MongoConnectionInformation = _expressAppReference.get('LOSS_DATABASE_LIVETOKENSTORAGE')

	// Check if the databases are offline
	if (clientTokenStorageConnectionInfo.isConnected === false || liveTokenStorageConnectionInfo.isConnected === false) { res.status(503).json({ code: 503, message: "Service unavailable", }); return; }

	// Continue database initialization
	const clientTokenStorageClient: MongoClient = clientTokenStorageConnectionInfo.client
	const clientTokenStorageCollection: Collection = clientTokenStorageClient.db().collection(_clientTokenStorageCollectionName)
	const liveTokenStorageClient: MongoClient = liveTokenStorageConnectionInfo.client
	const liveTokenStorageCollection: Collection = liveTokenStorageClient.db().collection(_liveTokenStorageCollectionName)

	// Prepare fetch query and fetch options
	const fetchQuery: object = { clientToken: clientToken, }
	const fetchQueryOptions: object = { projection: { _id: 0, appName: 1, serverAccessToken: 1, serverRefreshToken: 1, clientAccessScopes: 1, }, }

	// Search for client token
	const foundClientToken: WithId<Document> | void | null = await clientTokenStorageCollection.findOne(fetchQuery, fetchQueryOptions)
		.catch((error: Error) => {
			_lossLoggingModule.err(`Error while fetching data from ${clientTokenStorageConnectionInfo.databaseName}@${_clientTokenStorageCollectionName} | ${error}`)
			res.status(500).json({ code: 500, message: "Server error", })
			return
		})

	// Log
	_lossLoggingModule.log(`Successfully fetched data from ${clientTokenStorageConnectionInfo.databaseName}@${_clientTokenStorageCollectionName}`)

	// Check if the client token was found
	if (!foundClientToken) { res.status(401).json({ code: 401, message: "Client token invalid", }); return; }

	// Save data
	const appName: string = foundClientToken.appName
	const serverAccessToken: string = foundClientToken.serverAccessToken
	const serverRefreshToken: string = foundClientToken.serverRefreshToken
	const clientAccessScopes: object = foundClientToken.clientAccessScopes

	// Generate JWT's
	const jwtPayload: object = { appName: appName, clientAccessScopes: clientAccessScopes, }
	let jwtAccessToken: string = await _lossSecurityModule.generateJsonWebToken(jwtPayload, serverAccessToken, { expiresIn: _tokenExpirationTime, })
	let jwtRefreshToken: string = await _lossSecurityModule.generateJsonWebToken(jwtPayload, serverRefreshToken)

	// Save refresh token to live token storage
	const writeData: object = { refreshToken: jwtRefreshToken, accessToken: jwtAccessToken, }
	await liveTokenStorageCollection.insertOne(writeData)
		.catch((error: Error) => {
			_lossLoggingModule.err(`Error while writing data to ${liveTokenStorageConnectionInfo.databaseName}@${_liveTokenStorageCollectionName} | ${error}`)
			res.status(500).json({ code: 500, message: "Server error", })
			return
		})

	// Log
	_lossLoggingModule.log(`Successfully wrote data to ${liveTokenStorageConnectionInfo.databaseName}@${_liveTokenStorageCollectionName}`)

	// Send response
	res.status(200).json({ code: 200, message: "Ok", data: { jwtAccessToken: jwtAccessToken, jwtRefreshToken: jwtRefreshToken, }, })
	return
}

/**
 * `POST /refresh-user`
 * @description Refreshes a user's access token
 * @requires Client Token && Refresh Token
 * @param { Request } req - The request object 
 * @param { Response } res - The response object 
 * @returns { Promise<void> } void
 */
async function refreshUser(req: Request, res: Response): Promise<void> {
	// Retrieve authorization header
	const authorizationHeader: string | undefined = req.headers.authorization

	// Check if the authorization header is empty
	if (!authorizationHeader) { res.status(401).json({ code: 401, message: "Empty authorization header", }); return; }

	// Split the header
	const splitHeader: string | Array<string> = await _lossUtilityModule.returnToken(authorizationHeader, true)
	const clientToken: string = splitHeader[0]
	const jwtRefreshToken: string = splitHeader[1]

	// Check if a client token and refresh token were supplied
	if (!clientToken || !jwtRefreshToken) { res.status(401).json({ code: 401, message: "Client token or refresh token not supplied", }); return; }

	// Retrieve database references
	const clientTokenStorageConnectionInfo: MongoConnectionInformation = _expressAppReference.get('LOSS_DATABASE_CLIENTTOKENSTORAGE')
	const liveTokenStorageConnectionInfo: MongoConnectionInformation = _expressAppReference.get('LOSS_DATABASE_LIVETOKENSTORAGE')

	// Check if the databases are offline
	if (clientTokenStorageConnectionInfo.isConnected === false || liveTokenStorageConnectionInfo.isConnected === false) { res.status(503).json({ code: 503, message: "Service unavailable", }); return; }

	// Continue database initialization
	const clientTokenStorageClient: MongoClient = clientTokenStorageConnectionInfo.client
	const clientTokenStorageCollection: Collection = clientTokenStorageClient.db().collection(_clientTokenStorageCollectionName)
	const liveTokenStorageClient: MongoClient = liveTokenStorageConnectionInfo.client
	const liveTokenStorageCollection: Collection = liveTokenStorageClient.db().collection(_liveTokenStorageCollectionName)

	// Prepare fetch query and fetch options
	let fetchQuery: object = { clientToken: clientToken, }
	let fetchQueryOptions: object = { projection: { _id: 0, appName: 1, serverAccessToken: 1, clientAccessScopes: 1, }, }

	// Check if the client token is valid
	const foundClientToken: WithId<Document> | void | null = await clientTokenStorageCollection.findOne(fetchQuery, fetchQueryOptions)
		.catch((error: Error) => {
			_lossLoggingModule.err(`Error while fetching data from ${clientTokenStorageConnectionInfo.databaseName}@${_clientTokenStorageCollectionName} | ${error}`)
			res.status(500).json({ code: 500, message: "Server error", })
			return
		})

	// Log
	_lossLoggingModule.log(`Successfully fetched data from ${clientTokenStorageConnectionInfo.databaseName}@${_clientTokenStorageCollectionName}`)

	// Check if the client token was found
	if (!foundClientToken) { res.status(401).json({ code: 401, message: "Client token invalid", }); return; }

	// Prepare fetch query and fetch options
	fetchQuery = { refreshToken: jwtRefreshToken, }
	fetchQueryOptions = { projection: { _id: 0, refreshToken: 1, }, }

	// Check if the refresh token is valid
	const foundRefreshToken: WithId<Document> | void | null = await liveTokenStorageCollection.findOne(fetchQuery, fetchQueryOptions)
		.catch((error: Error) => {
			_lossLoggingModule.err(`Error while writing data to ${liveTokenStorageConnectionInfo.databaseName}@${_liveTokenStorageCollectionName} | ${error}`)
			res.status(500).json({ code: 500, message: "Server error", })
			return
		})

	// Log
	_lossLoggingModule.log(`Successfully fetched data from ${liveTokenStorageConnectionInfo.databaseName}@${_liveTokenStorageCollectionName}`)

	// Check if the refresh token was found
	if (!foundRefreshToken) { res.status(401).json({ code: 401, message: "Refresh token invalid", }); return; }

	// Save data
	const appName: string = foundClientToken.appName
	const clientAccessScopes: object = foundClientToken.clientAccessScopes
	const serverAccessToken: string = foundClientToken.serverAccessToken

	// Generate JWT
	const jwtPayload: object = { appName: appName, clientAccessScopes: clientAccessScopes, }
	let jwtAccessToken: string = await _lossSecurityModule.generateJsonWebToken(jwtPayload, serverAccessToken, { expiresIn: _tokenExpirationTime, })

	// Prepare fetch query and fetch options
	let updateQuery: object = { "$set": { accessToken: jwtAccessToken, }, }
	fetchQuery = { refreshToken: jwtRefreshToken, }

	// Update live token database
	const wasUpdatedSuccessfully: ModifyResult<Document> | void | null = await liveTokenStorageCollection.findOneAndUpdate(fetchQuery, updateQuery)
		.catch((error: Error) => {
			_lossLoggingModule.err(`Error while finding and updating data from ${liveTokenStorageConnectionInfo.databaseName}@${_liveTokenStorageCollectionName} | ${error}`)
			res.status(500).json({ code: 500, message: "Server error", })
			return
		})

	// Log
	_lossLoggingModule.log(`Successfully found and updated data from ${liveTokenStorageConnectionInfo.databaseName}@${_liveTokenStorageCollectionName}`)

	// Check if the update was successful
	if (!wasUpdatedSuccessfully) { res.status(500).json({ code: 500, message: "Server error", }); return; }

	// Send response
	res.status(200).json({ code: 200, message: "Ok", data: { jwtAccessToken: jwtAccessToken, }, })
	return
}

/**
 * `POST /logout-user`
 * @description Logs out a user by invalidating their refresh token
 * @description Contains `ModifyResult` type which is to be deprecated in later version of Mongo
 * @requires Client Token && Refresh Token
 * @param { Request } req - The request object 
 * @param { Response } res - The response object 
 * @returns { Promise<void> } void
 */
async function logoutUser(req: Request, res: Response): Promise<void> {
	// Retrieve authorization header
	const authorizationHeader: string | undefined = req.headers.authorization

	// Check if the authorization header is empty
	if (!authorizationHeader) { res.status(401).json({ code: 401, message: "Empty authorization header", }); return; }

	// Split the header
	const splitHeader: string | Array<string> = await _lossUtilityModule.returnToken(authorizationHeader, true)
	const clientToken: string = splitHeader[0]
	const jwtRefreshToken: string = splitHeader[1]

	// Check if a client token and refresh token were supplied
	if (!clientToken || !jwtRefreshToken) { res.status(401).json({ code: 401, message: "Client token or refresh token not supplied", }); return; }

	// Retrieve database references
	const clientTokenStorageConnectionInfo: MongoConnectionInformation = _expressAppReference.get('LOSS_DATABASE_CLIENTTOKENSTORAGE')
	const liveTokenStorageConnectionInfo: MongoConnectionInformation = _expressAppReference.get('LOSS_DATABASE_LIVETOKENSTORAGE')

	// Check if the databases are offline
	if (clientTokenStorageConnectionInfo.isConnected === false || liveTokenStorageConnectionInfo.isConnected === false) { res.status(503).json({ code: 503, message: "Service unavailable", }); return; }

	// Continue database initialization
	const clientTokenStorageClient: MongoClient = clientTokenStorageConnectionInfo.client
	const clientTokenStorageCollection: Collection = clientTokenStorageClient.db().collection(_clientTokenStorageCollectionName)
	const liveTokenStorageClient: MongoClient = liveTokenStorageConnectionInfo.client
	const liveTokenStorageCollection: Collection = liveTokenStorageClient.db().collection(_liveTokenStorageCollectionName)

	// Prepare fetch query and fetch options
	let fetchQuery: object = { clientToken: clientToken, }
	let fetchQueryOptions: object = { projection: { _id: 0, appName: 1, serverAccessToken: 1, clientAccessScopes: 1, }, }

	// Check if the client token is valid
	const foundClientToken: WithId<Document> | void | null = await clientTokenStorageCollection.findOne(fetchQuery, fetchQueryOptions)
		.catch((error: Error) => {
			_lossLoggingModule.err(`Error while fetching data from ${clientTokenStorageConnectionInfo.databaseName}@${_clientTokenStorageCollectionName} | ${error}`)
			res.status(500).json({ code: 500, message: "Server error", })
			return
		})

	// Log
	_lossLoggingModule.log(`Successfully fetched data from ${clientTokenStorageConnectionInfo.databaseName}@${_clientTokenStorageCollectionName}`)

	// Check if the client token was found
	if (!foundClientToken) { res.status(401).json({ code: 401, message: "Client token invalid", }); return; }

	// Prepare fetch query and fetch options
	fetchQuery = { refreshToken: jwtRefreshToken, }
	fetchQueryOptions = { projection: { _id: 0, refreshToken: 1, }, }

	// Find the refresh token and delete it
	const wasDeletedSuccessfully: WithId<Document> | void | null | ModifyResult<Document> = await liveTokenStorageCollection.findOneAndDelete(fetchQuery)
		.catch((error: Error) => {
			_lossLoggingModule.err(`Error while finding and deleting data from ${liveTokenStorageConnectionInfo.databaseName}@${_liveTokenStorageCollectionName} | ${error}`)
			res.status(500).json({ code: 500, message: "Server error", })
			return
		})

	// Log
	_lossLoggingModule.log(`Successfully found and deleted data from ${liveTokenStorageConnectionInfo.databaseName}@${_liveTokenStorageCollectionName}`)

	// Check if the refresh token was found
	if (!wasDeletedSuccessfully || !wasDeletedSuccessfully.value) { res.status(401).json({ code: 401, message: "Refresh token invalid", }); return; }

	// Send response
	res.status(200).json({ code: 200, message: "Ok", })
	return
}

// Private Methods

// Run
module.exports.init = async function (expressApp: Express, loadedRouteModules: RouteModules): Promise<Router> {
	// Create a new route instance
	const spaceguardAuthorizationRoute: Route = await Route.init(expressApp, loadedRouteModules)

	// Get references
	const app: Express = await spaceguardAuthorizationRoute.getApp()
	const router: Router = await spaceguardAuthorizationRoute.getRouter()
	const modules: RouteModules = await spaceguardAuthorizationRoute.getModules()

	// Set references
	_expressAppReference = app
	_lossLoggingModule = modules.lossLoggingModule
	_lossUtilityModule = modules.lossUtilityModule
	_lossSecurityModule = modules.lossSecurityModule
	_tokenExpirationTime = app.get('LOSS_ENV_SPACE_GUARD_CONFIGURATION_TOKEN_EXPIRATION_TIME')
	_liveTokenStorageCollectionName = app.get('LOSS_ENV_SPACE_GUARD_DATABASE_LIVE_TOKEN_STORAGE_COLLECTION_NAME')
	_clientTokenStorageCollectionName = app.get('LOSS_ENV_SPACE_GUARD_DATABASE_CLIENT_TOKEN_STORAGE_COLLECTION_NAME')

	// Setup endpoints
	router.post('/authorize-user', authorizeUser)
	router.post('/refresh-user', refreshUser)
	router.post('/logout-user', logoutUser)

	// Return router
	return router
}