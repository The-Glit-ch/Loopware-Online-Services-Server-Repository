// Imports
import { Route, RouteModules } from '../../common/classes/route';
import { LossUtilityModule } from '../../modules/utility_module/module';
import { LossLoggingModule } from '../../modules/logging_module/module';
import { LossSecurityModule } from '../../modules/security_module/security_module';
import { MongoConnectionInformation } from '../../common/interfaces/mongo_connection_information';

import { Collection, Document, MongoClient, WithId } from 'mongodb';
import { Express, Router, Request, Response, NextFunction } from 'express';

// Docstring
/**
 * Loopware Online Subsystem @ Authorization Middleware
 * Custom middleware that checks if a user is authorized
 */

// Enums

// Interfaces

// Classes

// Constants

// Public Variables

// Private Variables
let _clientTokenStorageCollectionName: string
let _liveTokenStorageCollectionName: string
let _lossLoggingModule: LossLoggingModule
let _lossUtilityModule: LossUtilityModule
let _lossSecurityModule: LossSecurityModule
let _expressAppReference: Express

// _init()

// Public Methods
async function authorizationMiddlewareFunc(req: Request, res: Response, next: NextFunction): Promise<void> {
	// Retrieve authorization header
	const authorizationHeader: string | undefined = req.headers.authorization

	// Check if the authorization header is empty
	if (!authorizationHeader) { res.status(401).json({ code: 401, message: "Empty authorization header", }); return; }

	// Split the header
	const splitHeader: string | Array<string> = await _lossUtilityModule.returnToken(authorizationHeader, true)
	const clientToken: string = splitHeader[0]
	const jwtAccessToken: string = splitHeader[1]

	// Check if a client token and access token were supplied
	if (!clientToken || !jwtAccessToken) { res.status(401).json({ code: 401, message: "Client token or access token not supplied", }); return; }

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
	let fetchQueryOptions: object = { projection: { _id: 0, serverAccessToken: 1, }, }

	// Check if the client token is valid
	const foundClientToken: WithId<Document> | void | null = await clientTokenStorageCollection.findOne(fetchQuery, fetchQueryOptions)
		.catch((error: Error) => {
			_lossLoggingModule.err(`Error while fetching data from [${clientTokenStorageConnectionInfo.databaseName}@${_clientTokenStorageCollectionName}] | ${error}`)
			res.status(500).json({ code: 500, message: "Server error", })
			return
		})

	// Log
	_lossLoggingModule.log(`Successfully fetched data from [${clientTokenStorageConnectionInfo.databaseName}@${_clientTokenStorageCollectionName}]`)

	// Check if the client token was found
	if (!foundClientToken) { res.status(401).json({ code: 401, message: "Client token invalid", }); return; }

	// Save server access token
	const serverAccessToken: string = foundClientToken.serverAccessToken

	// Prepare fetch query and fetch options
	fetchQuery = { accessToken: jwtAccessToken, }
	fetchQueryOptions = { projection: { _id: 0, accessToken: 1, }, }

	// Check if the access token is valid
	const foundAccessToken: WithId<Document> | void | null = await liveTokenStorageCollection.findOne(fetchQuery, fetchQueryOptions)
		.catch((error: Error) => {
			_lossLoggingModule.err(`Error while writing data to [${liveTokenStorageConnectionInfo.databaseName}@${_liveTokenStorageCollectionName}] | ${error}`)
			res.status(500).json({ code: 500, message: "Server error", })
			return
		})

	// Log
	_lossLoggingModule.log(`Successfully fetched data from [${liveTokenStorageConnectionInfo.databaseName}@${_liveTokenStorageCollectionName}]`)

	// Check if the access token was found
	if (!foundAccessToken) { res.status(401).json({ code: 401, message: "Access token invalid", }); return; }

	// Decode access token
	const wasDecodedSuccessfully: any = await _lossSecurityModule.decodeJsonWebToken(jwtAccessToken, serverAccessToken)
		.catch((error: Error) => {
			if (error.name === "TokenExpiredError") { res.status(401).json({ code: 401, message: "Expired token", }); return; }
			_lossLoggingModule.err(`Error while decoding access JWT | ${error}`)
			res.status(500).json({ code: 500, message: "Server error", })
			return
		})

	// Check if we have a valid access token
	if (wasDecodedSuccessfully) { next(); }
}

// Private Methods

// Run
module.exports.init = async function (expressApp: Express, loadedRouteModules: RouteModules): Promise<Router> {
	// Create a new route instance
	const authorizationMiddleware: Route = await Route.init(expressApp, loadedRouteModules)

	// Get references
	const app: Express = await authorizationMiddleware.getApp()
	const router: Router = await authorizationMiddleware.getRouter()
	const modules: RouteModules = await authorizationMiddleware.getModules()

	// Set references
	_expressAppReference = app
	_lossLoggingModule = modules.lossLoggingModule
	_lossUtilityModule = modules.lossUtilityModule
	_lossSecurityModule = modules.lossSecurityModule
	_liveTokenStorageCollectionName = app.get('LOSS_ENV_SPACE_GUARD_DATABASE_LIVE_TOKEN_STORAGE_COLLECTION_NAME')
	_clientTokenStorageCollectionName = app.get('LOSS_ENV_SPACE_GUARD_DATABASE_CLIENT_TOKEN_STORAGE_COLLECTION_NAME')

	// Set middleware
	router.use(authorizationMiddlewareFunc)

	// Return router
	return router
}