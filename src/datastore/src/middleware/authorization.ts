// Imports
import express from 'express'
import { verifyAndDecodeJWT, validateClientToken } from '../../../../shared/authorization-module/src/authorization_module'

// Docstring
/**
 * Loopware Online Subsystem @ Authorization Middleware || Middleware module that can be enabled/disabled via the
 * AUTH_ENABLED environment variable. Note: Both the Authorization server environment configuration and Datastore environment configuration
 * must contain the same SERVER_ACCESS_TOKEN and SERVER_REFRESH_TOKEN values
 */

// Enums

// Interface
interface OAUTHStatus {
	error?: string
	verified: Boolean
}

// Constants
const router = express.Router()

// Public Variables

// Private Variables

// _init()

// Public Methods
router.use(async(req, res, next) => {
	let authorizationHeader: string | undefined = req.headers.authorization
	let accessJWT: string | undefined = authorizationHeader?.split(" ")[1]
	let serverAccessToken: string | undefined = process.env.SERVER_ACCESS_TOKEN

	// Empty Authorization Header?
	if (accessJWT == undefined){ res.status(401).json({code: 401, message: "Access token was not provided"}); return; }
	// Undefined Server Access Token?
	if (serverAccessToken == undefined){ res.status(500).json({code: 500, message: "Internal Server Error"}); return; }
	// Validate JWT
	let status: OAUTHStatus = await _oauthValidation(accessJWT, serverAccessToken)

	if(!status.verified){ res.status(403).json({code: 403, message: status.error}); return; }

	// All is good allow passage
	next()
})


// Private Methods
/**
 * Validates any incoming JWT. Returns a OAUTHStatus Promise
 * @param { string } accessJWT - Incoming JWT to verify. Should only be an access token 
 * @param { string } serverAccessToken - Server access token
 * @returns { Promise<OAUTHStatus> } Promise<OAUTHStatus>
 */
async function _oauthValidation(accessJWT: string, serverAccessToken: string): Promise<OAUTHStatus> {
	return new Promise((resolve, _reject) => {
		verifyAndDecodeJWT(accessJWT, serverAccessToken)
			.catch((_error) => {
				resolve({error: 'Invalid Access Token', verified: false})
			})
			.then((data) => {
				if(!data){ return; }
				if(!validateClientToken(data.token, serverAccessToken)){
					resolve({error: 'Invalid Client Token', verified: false})
				}else{
					resolve({verified: true})
				}
			})
	})
}

// Run
module.exports = router