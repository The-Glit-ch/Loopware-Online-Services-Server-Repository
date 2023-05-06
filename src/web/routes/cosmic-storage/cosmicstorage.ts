// Imports
import { Route, RouteModules } from '../../../common/classes/route';

import { Express, Router } from 'express';

// Docstring
/**
 * Loopware Online Subsystem @ Cosmic Storage Service Endpoint Handler
 * Contains ?????
 */

// Enums

// Interfaces

// Classes

// Constants

// Public Variables

// Private Variables

// _init()

// Public Methods

// Private Methods

// Run
module.exports.init = async function (expressApp: Express, loadedRouteModules: RouteModules): Promise<Router> {
	// Create a new route instance
	const cosmicstorageRoute: Route = await Route.init(expressApp, loadedRouteModules)

	// Get references
	const router: Router = await cosmicstorageRoute.getRouter()

	// Set routes
	const datastoreRoute: Router = await require('./routes/datastore').init(expressApp, loadedRouteModules)
	router.use("/datastore", datastoreRoute)

	// Return router
	return router
}