// Imports
import { join } from 'path';

import { Route, RouteModules } from '../../../../common/classes/route';
import { LossLoggingModule } from '../../../../modules/logging_module/module';
import { LossUtilityModule } from '../../../../modules/utility_module/module';

import { Router, Express, Request, Response } from 'express';

// Docstring

// Enums

// Interfaces

// Classes

// Constants

// Public Variables

// Private Variables
let _expressAppReference: Express
let _lossLoggingModule: LossLoggingModule
let _lossUtilityModule: LossUtilityModule

// _init()

// Public Methods
async function assetStream(req: Request, res: Response): Promise<void> {
	// Retrieve request body
	const requestBody: object | any = req.body

	// Check if the body is empty
	if (Object.keys(requestBody).length === 0) { res.status(400).json({ code: 400, message: "Invalid body", }); return; }

	// Attempt to locate the file
	let filePath: string = join(_expressAppReference.get('LOSS_ENV_COSMIC_STORAGE_CONFIGURATION_ASSET_STREAMING_FOLDER_PATH'), requestBody.filePath)
	if (await _lossUtilityModule.filePathExists(filePath)) {
		// Send response
		res.status(200).download(filePath, (error: Error) => { if (error) { _lossLoggingModule.err(`Error while streaming data to client | ${error}`); return; }; })
		return
	} else {
		// Send response
		res.status(404).json({ code: 404, message: "Not found", })
		return
	}
}

// Private Methods

// Run
module.exports.init = async function (expressApp: Express, loadedRouteModules: RouteModules): Promise<Router> {
	// Create a new route instance
	const cosmicstorageAssetStreamingRoute: Route = await Route.init(expressApp, loadedRouteModules)

	// Get references
	const app: Express = await cosmicstorageAssetStreamingRoute.getApp()
	const router: Router = await cosmicstorageAssetStreamingRoute.getRouter()
	const modules: RouteModules = await cosmicstorageAssetStreamingRoute.getModules()

	// Set references
	_expressAppReference = app
	_lossLoggingModule = modules.lossLoggingModule
	_lossUtilityModule = modules.lossUtilityModule

	// Setup endpoints
	router.get("/stream", assetStream)

	// Return router
	return router
}