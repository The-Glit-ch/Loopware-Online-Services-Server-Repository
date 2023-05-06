// Imports
import { Route, RouteModules } from '../../../../common/classes/route';

import { Express, Router } from 'express';

// Docstring

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
	const cosmicstorageDatastoreRoute: Route = await Route.init(expressApp, loadedRouteModules)

	// Get references
	const router: Router = await cosmicstorageDatastoreRoute.getRouter()

	// Set routes

	// Return router
	return router
}