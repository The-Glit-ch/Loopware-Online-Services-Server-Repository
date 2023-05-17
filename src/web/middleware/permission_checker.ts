// Imports
import { RouteModules, Route } from '../../common/classes/route';
import { LossLoggingModule } from '../../modules/logging_module/module';
import { LossUtilityModule } from '../../modules/utility_module/module';
import { ClientAccessScopes, LossSecurityModule } from '../../modules/security_module/module';
import { MongoConnectionInformation } from '../../common/interfaces/mongo_connection_information';

import { MongoClient, Collection, Document, WithId } from 'mongodb';
import { Express, NextFunction, Request, Response, Router } from 'express';

// Docstring
/**
 * Loopware Online Subsystem @ Permission Checker Middleware
 * Custom middleware that checks if a user has the required permissions
 * This middleware MUST be used after the authorization middleware due to the lack of security measures it contains
 * This is to reduce time double checking an already authorized user
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
let _requiredClientPermissions: ClientAccessScopes
let _clientTokenStorageCollectionName: string

// _init()

// Public Methods
async function checkPermissionLevels(req: Request, res: Response, next: NextFunction): Promise<void> {
	// Retrieve authorization header
	const authorizationHeader: string | undefined = req.headers.authorization

	// Check if the authorization header is empty
	if (!authorizationHeader) { res.status(401).json({ code: 401, message: "Empty authorization header", }); return; }

	// Split the header
	const splitHeader: string | Array<string> = await _lossUtilityModule.returnToken(authorizationHeader, true)
	const clientToken: string = splitHeader[0]

	// Retrieve database references
	const clientTokenStorageConnectionInfo: MongoConnectionInformation = _expressAppReference.get('LOSS_DATABASE_CLIENTTOKENSTORAGE')

	// Check if the databases are offline
	if (clientTokenStorageConnectionInfo.isConnected === false) { res.status(503).json({ code: 503, message: "Service unavailable", }); return; }

	// Continue database initialization
	const clientTokenStorageClient: MongoClient = clientTokenStorageConnectionInfo.client
	const clientTokenStorageCollection: Collection = clientTokenStorageClient.db().collection(_clientTokenStorageCollectionName)

	// Prepare fetch query and fetch options
	let fetchQuery: object = { clientToken: clientToken, }
	let fetchQueryOptions: object = { projection: { _id: 0, clientAccessScopes: 1, }, }

	// Fetch client permission levels object
	const foundClientPermissions: WithId<Document> | void | null = await clientTokenStorageCollection.findOne(fetchQuery, fetchQueryOptions)
		.catch((error: Error) => {
			_lossLoggingModule.err(`Error while fetching data from ${clientTokenStorageConnectionInfo.databaseName}@${_clientTokenStorageCollectionName} | ${error}`)
			res.status(500).json({ code: 500, message: "Server error", })
			return
		})

	// Log
	_lossLoggingModule.log(`Successfully fetched data from ${clientTokenStorageConnectionInfo.databaseName}@${_clientTokenStorageCollectionName}`)

	// Check if the client permission levels object was found
	if (!foundClientPermissions) { res.status(500).json({ code: 500, message: "Client token invalid", }); return; }

	// Check permission levels
	if (!await _lossSecurityModule.checkPermissionLevels(foundClientPermissions.clientAccessScopes, _requiredClientPermissions)) { res.status(403).json({ code: 403, message: "Invalid permission levels", }); return; }

	// Continue
	next()
}

// Private Methods

// Run
module.exports.init = async function (expressApp: Express, loadedRouteModules: RouteModules, requiredClientPermissions: ClientAccessScopes): Promise<Router> {
	// Create a new route instance
	const permissionCheckerMiddleware: Route = await Route.init(expressApp, loadedRouteModules)

	// Get references
	const app: Express = await permissionCheckerMiddleware.getApp()
	const router: Router = await permissionCheckerMiddleware.getRouter()
	const modules: RouteModules = await permissionCheckerMiddleware.getModules()

	// Set references
	_expressAppReference = app
	_lossLoggingModule = modules.lossLoggingModule
	_lossUtilityModule = modules.lossUtilityModule
	_lossSecurityModule = modules.lossSecurityModule
	_requiredClientPermissions = requiredClientPermissions
	_clientTokenStorageCollectionName = _expressAppReference.get('LOSS_ENV_SPACE_GUARD_DATABASE_CLIENT_TOKEN_STORAGE_COLLECTION_NAME')

	// Set middleware
	router.use(checkPermissionLevels)

	// Return router
	return router
}