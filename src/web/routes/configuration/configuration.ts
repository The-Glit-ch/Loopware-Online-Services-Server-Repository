// Imports
import { log, wrn, err } from '../../../modules/logging_module/module'
import express, { Router } from 'express'

// Docstring
/**
 * Loopware Online Subsystem @ Configuration Endpoint
 * A command and control center for all other Loss services
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
	// Enable localhost middleware
	let localhost = require('../../middleware/localhost')
	router.use(localhost)
}

// Public Methods

// Private Methods

// Callbacks

// Run
_init()
module.exports = router