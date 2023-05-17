// Imports
import { Route, RouteModules } from '../../../../common/classes/route';
import { LossUtilityModule } from '../../../../modules/utility_module/module';
import { LossLoggingModule } from '../../../../modules/logging_module/module';
import { ClientTokenData, LossSecurityModule } from '../../../../modules/security_module/module';
import { MongoConnectionInformation } from '../../../../common/interfaces/mongo_connection_information';

import { Collection, MongoClient } from 'mongodb';
import { Express, Router, Request, Response } from 'express';

// Docstring
/**
 * Loopware Online Subsystem @ Configuration/Space Guard Endpoint
 * Handles any live configurations done to the Space Guard service
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

// _init()

// Public Methods
/**
 * `POST /new-client-token`
 * @description Creates and returns a new client token
 * @param { Request } req - The request object 
 * @param { Response } res - The response object 
 * @returns { Promise<void> } void
 */
async function newClientToken(req: Request, res: Response): Promise<void> {
	// Retrieve request body
	const requestBody: object | any = req.body

	// Check if the body is empty
	if (Object.keys(requestBody).length === 0) { res.status(400).json({ code: 400, message: "Invalid body", }); return; }

	// Store the new client token data
	const clientRegistrationData: object | any = { appName: requestBody.appName, clientAccessScopes: requestBody.clientAccessScopes, }
	const dummyData: object = { appName: "", clientAccessScopes: { web: { cosmicStorage: { datastoreService: true, leaderboardService: true, assetStreamingService: true, }, }, net: { hypernetService: true, groundControlService: true, }, }, }

	// Validate the data
	if (!await _lossUtilityModule.isInstanceOf(clientRegistrationData, dummyData)) { res.status(400).json({ code: 400, message: "Invalid body", }); return; }

	// Generate a client token
	const newClientTokenData: ClientTokenData = await _lossSecurityModule.generateNewClientToken(clientRegistrationData.appName, clientRegistrationData.clientAccessScopes)

	// Get database reference
	const clientTokenStorageConnectionInfo: MongoConnectionInformation = _expressAppReference.get('LOSS_DATABASE_CLIENTTOKENSTORAGE')
	const clientTokenStorageClient: MongoClient = clientTokenStorageConnectionInfo.client

	// Check if the database is online
	if (!clientTokenStorageConnectionInfo.isConnected) { res.status(503).json({ code: 503, message: "Unavailable", }); return; }

	// Finalize database pre-setup
	const clientTokenStorageCollection: Collection = clientTokenStorageClient.db().collection('savedClientTokens')

	// Write data
	clientTokenStorageCollection.insertOne(newClientTokenData)
		.catch((error: Error) => {
			_lossLoggingModule.err(`Error while writing data to ${clientTokenStorageConnectionInfo.databaseName}@savedClientTokens | ${error}`)
			res.status(500).json({ code: 500, message: "Server error", })
			return
		})
		.then(() => {
			_lossLoggingModule.log(`Successfully wrote data to ${clientTokenStorageConnectionInfo.databaseName}@savedClientTokens`)
			res.status(200).json({ code: 200, message: "Ok", data: { clientToken: newClientTokenData.clientToken, }, })
			return
		})
}

// Private Methods

// Run
module.exports.init = async function (expressApp: Express, loadedRouteModules: RouteModules): Promise<Router> {
	// Create a new route instance
	const spaceguardConfigurationRoute: Route = await Route.init(expressApp, loadedRouteModules)

	// Get references
	const app: Express = await spaceguardConfigurationRoute.getApp()
	const router: Router = await spaceguardConfigurationRoute.getRouter()
	const modules: RouteModules = await spaceguardConfigurationRoute.getModules()

	// Set references
	_expressAppReference = app
	_lossLoggingModule = modules.lossLoggingModule
	_lossUtilityModule = modules.lossUtilityModule
	_lossSecurityModule = modules.lossSecurityModule

	// Setup endpoints
	router.post('/new-client-token', newClientToken)

	// Return router
	return router
}