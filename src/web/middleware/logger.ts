// Imports
import { Route, RouteModules } from '../../common/classes/route';
import { LossLoggingModule } from '../../modules/logging_module/module';

import { Express, Router } from 'express';

// Docstring
/**
 * Loopware Online Subsystem @ Logging Middleware
 * Custom middleware that logs any connection coming into Loss
 */

// Classes

// Enums

// Interfaces

// Constants

// Public Variables

// Private Variables

// _init()

// Public Methods

// Private Methods

// Run
module.exports.init = async function (expressApp: Express, loadedRouteModules: RouteModules): Promise<Router> {
	// Create a new route instance
	const loggerMiddleware: Route = await Route.init(expressApp, loadedRouteModules)

	// Get references
	const router: Router = await loggerMiddleware.getRouter()
	const routeModules: RouteModules = await loggerMiddleware.getModules()
	const lossLoggingModule: LossLoggingModule = routeModules.lossLoggingModule

	// Set middleware
	router.use((req, _res, next) => { lossLoggingModule.log(`New "${req.protocol.toUpperCase()}" connection to "${req.baseUrl + req.url}" from "${req.ip}" using "${req.method.toUpperCase()}"`); next(); })

	// Return router
	return router
}