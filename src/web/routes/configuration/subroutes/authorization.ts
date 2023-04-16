// Imports
import https from 'https'
import { app } from '../../../index'
import { err } from '../../../../modules/logging_module/module'
import { returnContentLength, objectNullCheck } from '../../../../modules/utility_module/module'
import { request, RequestOptions, RequestMethod } from '../../../../modules/requests_module/module'
import express, { Router } from 'express'


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
const IS_PRODUCTION: boolean = app.get('LOSS_IS_PRODUCTION')
const AUTHORIZATION_CONFIGURATION_ENDPOINT_URL: string = "https://127.0.0.1:8080/authorization/api/v1/_/configuration"

// ENV Constants

// Public Variables

// Private Variables

// _init()

// Public Methods
router.post("/new-client", (req, res) => {
	// Retrieve incoming data
	let incomingData: object | any = req.body

	// Check if we received an empty body
	if (Object.keys(incomingData).length === 0) { res.status(400).json({ code: 400, message: "Empty body", }); return; }

	// Store data
	let newClientInformation: object = { appName: incomingData.appName, database: incomingData.database, networking: incomingData.networking, }

	// Null check
	if (objectNullCheck(newClientInformation)) { res.status(400).json({ code: 400, message: "Invalid body", }); return; }

	// Prepare payload
	let requestURL: string = AUTHORIZATION_CONFIGURATION_ENDPOINT_URL + "/new-client"
	let requestMethod: RequestMethod = RequestMethod.POST
	let requestAgent: boolean | https.Agent = (IS_PRODUCTION) ? (false) : (new https.Agent({ rejectUnauthorized: false, requestCert: false, }))
	let requestOptions: RequestOptions = { agent: requestAgent, body: newClientInformation, headers: { "Content-Type": "application/json", "Content-Length": returnContentLength(newClientInformation), }}

	// Send data to authorization service
	request(requestURL, requestMethod, requestOptions)
		.catch((error: Error) => {
			err(`Error while sending data to "/new-client" endpoint | ${error}`)
			res.status(500).json({ code: 500, message: "Server error", })
			return
		})
		.then((returnClientInformation: any) => {
			res.status(200).json({ code: 200, message: "OK", })
		})
})

// Private Methods

// Callbacks

// Run
module.exports = router