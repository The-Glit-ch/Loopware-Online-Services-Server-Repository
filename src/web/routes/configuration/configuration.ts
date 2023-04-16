// Imports
import { app } from '../../index'
import express, { Router } from 'express'

// Docstring
/**
 * Loopware Online Subsystem @ Configuration Endpoint
 * A command and control center for all other Loss services
 * SHOULD be used with the Loss CLI tool
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
	let authorizationEndpoint: NodeRequire = require('./subroutes/authorization')
	router.use("/_/authorization/", localhostMiddleware, authorizationEndpoint)
}

// Public Methods

// Private Methods

// Callbacks

// Run
_init()
module.exports = router