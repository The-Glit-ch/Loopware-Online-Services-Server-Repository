// Imports
import { Route, RouteModules } from '../../../common/classes/route';

import { Express, Router } from 'express';

// Docstring
/**
 * Loopware Online Subsystem @ Configuration Parent Endpoint
 * Parent endpoint for the configuration service
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
	const configurationRoute: Route = await Route.init(expressApp, loadedRouteModules)

	// Get references
	const router: Router = await configurationRoute.getRouter()

	// Set routes
	const authorizationRoute: Router = await require('./routes/spaceguard').init(expressApp, loadedRouteModules)
	router.use("/_/space-guard/", authorizationRoute)

	// Return router
	return router
}