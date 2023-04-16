// Imports
import { app, MongoConnectionInformation } from '../../../index'
import { generateClientToken, AccessScopes } from '../../../../modules/authorization_module/module'
import { objectNullCheck } from '../../../../modules/utility_module/module'
import { MongoClient } from 'mongodb'
import express, { Router } from 'express'

// Docstring
/**
 * Loopware Online Subsystem @ Authorization/Configuration Endpoint
 * Configuration endpoint for the authorization service
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

// Public Methods
router.post("/new-client", (req, res) => {
	// Retrieve incoming data
	let incomingData: object | any = req.body

	// Check if we received an empty body
	if (Object.keys(incomingData).length === 0) { res.status(400).json({ code: 400, message: "Empty body", }); return; }

	// Store data
	let newClientInformation: object | any = { appName: incomingData.appName, database: incomingData.database, networking: incomingData.networking, }

	// Null check
	if (objectNullCheck(newClientInformation)) { res.status(400).json({ code: 400, message: "Invalid body", }); return; }

	// Generate a new client token
	let newClientToken = generateClientToken(newClientInformation.appName, 64, { database: newClientInformation.database, networking: newClientInformation.networking, })

	// Retrieve client token storage object
	const clientTokenStorageDatabaseConnectionInformation: MongoConnectionInformation = app.get('LOSS_DATABASE_CLIENT_TOKEN_STORAGE')
	let clientTokenStorageClient: MongoClient = clientTokenStorageDatabaseConnectionInformation.mongoClient
	let isConnected: boolean = clientTokenStorageDatabaseConnectionInformation.isConnected

})

// Private Methods

// Callbacks

// Run
module.exports = router