// Imports
import express, { Router } from 'express'

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
	// Enable sub routes
	let localhost = require('../../middleware/localhost')
	let configurationEndpoint = require('./subroutes/configuration')
	let authorizationEndpoint = require('./subroutes/authorization')
	let moduleEndpoint = require('./subroutes/module')
	router.use("/authorization", authorizationEndpoint)
	router.use("/_/configuration/", localhost, configurationEndpoint)
	router.use("/_/module/", localhost, moduleEndpoint)
}

// Public Methods

// Private Methods

// Callbacks

// Run
_init()
module.exports = router