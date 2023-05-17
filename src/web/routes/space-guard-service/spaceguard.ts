// Imports
import { Route, RouteModules } from '../../../common/classes/route';

import { Express, Router } from 'express';

// Docstring
/**
 * Loopware Online Subsystem @ Space Guard Parent Endpoint
 * Parent endpoint for the Space Guard service
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
	const spaceguardRoute: Route = await Route.init(expressApp, loadedRouteModules)

	// Get references
	const router: Router = await spaceguardRoute.getRouter()

	// Set routes
	const authorizationRoute: Router = await require('./routes/authorization').init(expressApp, loadedRouteModules)
	router.use("/", authorizationRoute)

	// Return router
	return router
}