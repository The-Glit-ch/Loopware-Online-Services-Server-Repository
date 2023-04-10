// Imports
import { request, RequestOptions } from '../../../../modules/requests_module/module'
import { AccessScopes } from '../../../../modules/authorization_module/module'
import express, { Router } from 'express'
import { Agent } from 'https'

// Docstring
/**
 * Loopware Online Subsystem @ Configuration/Authorization Endpoint
 * Configuration endpoint for the authorization service
 */

// Classes

// Enums

// Interface

// Constants
const router: Router = express.Router()
const AUTHORIZATION_CONFIGURATION_ENDPOINT_URL: string = "https://127.0.0.1:8080/authorization/api/v1/_/configuration/"

// ENV Constants

// Public Variables

// Private Variables

// _init()

// Public Methods
router.post("/new-client", (req, res) => {
	// Retrieve incoming data
	let incomingData: object | any = req.body

	// Check if we received an empty body
	if (Object.keys(incomingData).length === 0) { res.status(400).json({ code: 400, message: "Empty body" }); return; }

	// Store data
	let newClientInformation: AccessScopes = { database: incomingData.database, networking: incomingData.networking, }

	// Send data
	// let payload: RequestOptions = {
	// 	agent: {
	// 		https: 
	// 	}
	// }
	// request(AUTHORIZATION_CONFIGURATION_ENDPOINT_URL)

})

// Private Methods

// Callbacks

// Run