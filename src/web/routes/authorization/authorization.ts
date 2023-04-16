// Imports
import { app } from '../../index'
import express, { Express, Router } from 'express'

// Docstring
/**
 * Loopware Online Subsystems @ Authorization Endpoint
 * Contains sub routes for other authorization related endpoints
 */

// Classes

// Enums

// Interface

// Constants
const router: Router = express.Router()

// ENV Constants

// Public Variables

// Private Variables

// _init()
function _init(): void {
	// Retrieve localhost middleware
	let localhostMiddleware = app.get('LOSS_MIDDLEWARE_LOCALHOST')

	// Enable sub routes
	let moduleEndpoint = require('./subroutes/module')
	let configurationEndpoint = require('./subroutes/configuration')
	let authorizationEndpoint = require('./subroutes/authorization')
	router.use("/_/module/", localhostMiddleware, moduleEndpoint)
	router.use("/_/configuration/", localhostMiddleware, configurationEndpoint)
	router.use("/authorization/", authorizationEndpoint)
}

// Public Methods

// Private Methods

// Callbacks

// Run
_init()
module.exports = router