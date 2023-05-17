// Imports
import { Route, RouteModules } from '../../common/classes/route';

import { Express, Router } from 'express';

// Docstring
/**
 * Loopware Online Subsystem @ Localhost Middleware
 * Custom middleware that only allows connection from localhost
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
	const localhostMiddleware: Route = await Route.init(expressApp, loadedRouteModules)

	// Get references
	const router: Router = await localhostMiddleware.getRouter()

	// Set middleware
	router.use((req, res, next) => { if (req.ip !== "::ffff:127.0.0.1") { res.status(403).json({ code: 403, message: "Forbidden", }); return; }; next(); }) // Yes this is a one liner, no I'm not changing it

	// Return router
	return router
}