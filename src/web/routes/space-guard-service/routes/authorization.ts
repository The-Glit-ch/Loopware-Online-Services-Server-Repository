// Imports
import { Route, RouteModules } from '../../../../common/classes/route';
import { LossUtilityModule } from '../../../../modules/utility_module/module';
import { LossLoggingModule } from '../../../../modules/logging_module/module';
import { LossSecurityModule } from '../../../../modules/security_module/security_module';
import { MongoConnectionInformation } from '../../../../common/interfaces/mongo_connection_information';

import { Collection, MongoClient } from 'mongodb';
import { Express, Router, Request, Response } from 'express';

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
let _lossLoggingModule: LossLoggingModule
let _lossUtilityModule: LossUtilityModule
let _lossSecurityModule: LossSecurityModule
let _expressAppReference: Express

// _init()

// Public Methods
/**
 * `POST /authorize-user`
 * @description Authorizes a user with a valid client token. Returns an access JWT and refresh JWT
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
	const clientToken: string = authorizationHeader.split(" ")[1]

	// Check if a client token was supplied
	if (!clientToken) { res.status(401).json({ code: 401, message: "Client token not supplied", }); return; }

	// Retrieve database references
	const clientTokenStorageConnectionInfo: MongoConnectionInformation = _expressAppReference.get('LOSS_DATABASE_CLIENTTOKENSTORAGE')
	const liveTokenStorageConnectionInfo: MongoConnectionInformation = _expressAppReference.get('LOSS_DATABASE_LIVETOKENSTORAGE')

	// Check if the databases are offline
	if (clientTokenStorageConnectionInfo.isConnected === false || liveTokenStorageConnectionInfo.isConnected === false) { res.status(503).json({ code: 503, message: "Service unavailable", }); return; }

	// Continue database initialization
	const clientTokenStorageClient: MongoClient = clientTokenStorageConnectionInfo.client
	const clientTokenStorageCollection: Collection = clientTokenStorageClient.db().collection('savedClientTokens')
	const liveTokenStorageClient: MongoClient = liveTokenStorageConnectionInfo.client
	const liveTokenStorageCollection: Collection = liveTokenStorageClient.db().collection('liveRefreshTokens')

	// Prepare fetch query and fetch options
	const fetchQuery: object = { clientToken: clientToken, }
	const fetchQueryOptions: object = { projection: { _id: 0, appName: 1, serverAccessToken: 1, serverRefreshToken: 1, clientAccessScopes: 1, }, }

	// Check if the client token is valid
	clientTokenStorageCollection.findOne(fetchQuery, fetchQueryOptions)
		.catch((error: Error) => {
			_lossLoggingModule.err(`Error while fetching data from ${clientTokenStorageConnectionInfo.databaseName}@savedClientTokens | ${error}`)
			res.status(500).json({ code: 500, message: "Server error", })
			return
		})
		.then(async (foundClientToken: object | any) => {
			// Client token was not found
			if (!foundClientToken) { res.status(401).json({ code: 401, message: "Client token invalid", }); return; }

			// Log
			_lossLoggingModule.log(`Successfully fetched data from ${clientTokenStorageConnectionInfo.databaseName}@savedClientTokens`)

			// Save data
			const appName: string = foundClientToken.appName
			const serverAccessToken: string = foundClientToken.serverAccessToken
			const serverRefreshToken: string = foundClientToken.serverRefreshToken
			const clientAccessScopes: object = foundClientToken.clientAccessScopes

			// Generate JWTs
			const jwtPayload: object = { appName: appName, clientAccessScopes: clientAccessScopes, }
			let jwtAccessToken: string = await _lossSecurityModule.generateJsonWebToken(jwtPayload, serverAccessToken, { expiresIn: "30m", })
			let jwtRefreshToken: string = await _lossSecurityModule.generateJsonWebToken(jwtPayload, serverRefreshToken)

			// Save refresh token to live token storage
			const writeData: object = { refreshToken: jwtRefreshToken, }
			liveTokenStorageCollection.insertOne(writeData)
				.catch((error: Error) => {
					_lossLoggingModule.err(`Error while writing data to ${liveTokenStorageConnectionInfo.databaseName}@liveTokenStorage | ${error}`)
					res.status(500).json({ code: 500, message: "Server error", })
					return
				})
				.then(() => {
					_lossLoggingModule.log(`Successfully wrote data to ${liveTokenStorageConnectionInfo.databaseName}@liveTokenStorage`)
					res.status(200).json({ code: 200, message: "Ok", data: { jwtAccessToken: jwtAccessToken, jwtRefreshToken: jwtRefreshToken, }, })
					return
				})
		})
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

	// Setup endpoints
	router.post('/authorize-user', authorizeUser)

	// Return router
	return router
}