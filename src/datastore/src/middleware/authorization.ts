// Imports
import express from 'express'
import { validateAccessToken } from '../../../../shared/authorization-module/src/authorization_module'

// Docstring
/**
 * Loopware Online Subsystem @ Authorization Middleware || Handle user authorization for the datastore service
 */

// Enums

// Interface

// Constants
const router = express.Router()

// Public Variables

// Private Variables

// _init()

// Public Methods
router.use((req, res, next) => {
	// Retrieve access token
	let authorizationHeader: string | undefined = req.headers.authorization
	let combinedTokens: Array<string> | undefined = authorizationHeader?.split(" ")[1].split(":")
	let clientToken: string | undefined = combinedTokens?.pop()
	let accessToken: string | undefined = combinedTokens?.pop()

	// Tokens provided?
	if (clientToken == undefined || accessToken == undefined){ res.status(401).json({code: 401, message: "Access and client token not provided"}); return; }

	// Check access token
	validateAccessToken(String(accessToken), String(clientToken))
		.catch((error) => {
			res.status(error.code).json({code: error.code, message: error.message})
			return
		})
		.then((returnData: object | any) => {
			// No data received
			if (!returnData){ return; }

			// Verification failed
			if (returnData.code != 200){ res.status(returnData.code).json({code: returnData.code, message: returnData.message}); return; }
			
			// Store verified user data
			let verificationData: object | any = returnData.data
			res.locals.authorizedUserData = {clientToken: clientToken, appName: verificationData.appName}
			
			// Next
			if (verificationData.isValid === true){ next('route') }
		})
})

// Private Methods

// Run
module.exports = router