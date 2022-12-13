// Handles user authorization before they even reach an endpoint

// Express
import express from 'express'
const router = express.Router()

// Auth Module
import { verify_and_decode_jwt, validate_client_token } from '../../../shared/auth/src/authorization_module'

// Helper function
function oauth_validate(access_jwt: string, server_auth_access_token: string): Array<any>{
	let [success, data] = verify_and_decode_jwt(access_jwt, server_auth_access_token) // Verify and decode the JWT

	if (!success){ return [false, {code: 401, message: "Invalid access token"}]} //Invalid token, return 401

	// Although it *should* be impossible that a valid JWT is accepted BUT an invalid client token is there
	// It is still a good idea to check
	let valid: boolean = validate_client_token(data.token, server_auth_access_token)
	if (!valid){ return [false, {code: 401, message: "How??"}] }


	return [true, "verified request"]
}

router.use((req, res, next) => {
	let authorization_header: string | undefined = req.headers.authorization
	let access_jwt: string | undefined = authorization_header?.split(" ")[0]
	let server_access_token: string | undefined = process.env.AUTH_SERVER_ACCESS

	if (access_jwt == undefined){ return res.status(401).json({code: 401, message: "Access token was not provided"})}
	if (server_access_token == undefined){ return res.status(500).json({code: 500, message: "Internal authorization sever token not found."})}
	
	let [verified, message] = oauth_validate(access_jwt, server_access_token)

	if (!verified) { return res.status(message.code).json(message) }
	
	return next()
})

module.exports = router