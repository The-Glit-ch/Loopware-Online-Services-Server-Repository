// Imports
import { Route, RouteModules } from '../../../common/classes/route';
import { ClientAccessScopes } from '../../../modules/security_module/module';

import { Express, Router } from 'express';

// Docstring
/**
 * Loopware Online Subsystem @ Cosmic Storage Parent Endpoint
 * Parent endpoint for the Cosmic Storage service
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

	// Set permission levels
	const datastorePermissionLevels: ClientAccessScopes = {
		web: { cosmicStorage: { datastoreService: true, leaderboardService: false, assetStreamingService: false, }, },
		net: { hypernetService: false, groundControlService: false, },
	}
	const leaderboardPermissionLevels: ClientAccessScopes = {
		web: { cosmicStorage: { datastoreService: false, leaderboardService: true, assetStreamingService: false, }, },
		net: { hypernetService: false, groundControlService: false, },
	}
	const assetStreamingPermissionLevels: ClientAccessScopes = {
		web: { cosmicStorage: { datastoreService: false, leaderboardService: false, assetStreamingService: true, }, },
		net: { hypernetService: false, groundControlService: false, },
	}

	// Get permission checker middleware
	const datastorePermissionChecker: Router = await require('../../middleware/permission_checker').init(expressApp, loadedRouteModules, datastorePermissionLevels)
	const leaderboardPermissionChecker: Router = await require('../../middleware/permission_checker').init(expressApp, loadedRouteModules, leaderboardPermissionLevels)
	const assetStreamingPermissionChecker: Router = await require('../../middleware/permission_checker').init(expressApp, loadedRouteModules, assetStreamingPermissionLevels)

	// Set routes
	const datastoreRoute: Router = await require('./routes/datastore').init(expressApp, loadedRouteModules)
	const leaderboardRoute: Router = await require('./routes/leaderboard').init(expressApp, loadedRouteModules)
	const assetStreamingRoute: Router = await require('./routes/streaming').init(expressApp, loadedRouteModules)
	router.use("/datastore", datastorePermissionChecker, datastoreRoute)
	router.use("/leaderboard", leaderboardPermissionChecker, leaderboardRoute)
	router.use("/streaming", assetStreamingPermissionChecker, assetStreamingRoute)

	// Return router
	return router
}