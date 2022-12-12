// Server endpoint

// Express
import express from 'express'
const router = express.Router()

// Authorization Module
import { validate_client_token, generate_new_jwt, verify_and_decode_jwt } from '../../../shared/auth/src/authorization_module'

// Token Storage
var token_storage: Array<string> = new Array<string> // TODO: Add a Redis Cache server to hold refresh tokens

// (POST) /auth/server/register
// Register for a new access token. Client token must be provided for token to be granted
// || DONE ||
router.post("/register", (req, res) => {
	let auth_header: string |undefined = req.headers.authorization 					// Fetch the authorization header
	let client_token: string | undefined = auth_header?.split(" ")[1] 				// Client token. Used for registration of a new access token
	let server_access_token: string | undefined = process.env.AUTH_SERVER_ACCESS	// Fetch the server access token

	// Client token provided?
	if (client_token == undefined){ return res.status(400).json({"message": "No authorization token provided"}) }
	// Server access token available?
	if (server_access_token == undefined){ return res.status(500).json({"message": "Internal authorization error. Double check your cient token and internal server token"}) }

	// Client valid? If so generate new keys
	if (validate_client_token(client_token, server_access_token)){
		let access_token: string = generate_new_jwt({token: client_token}, String(process.env.AUTH_SERVER_ACCESS), {expiresIn: '30s'}) 	// Can expire, Client Token + Server Access Token
		let refresh_token: string = generate_new_jwt({token: client_token}, String(process.env.AUTH_SERVER_REFRESH)) 					// Dosent expire, CLient Token + Refresh Access Token

		// TODO: Add a Redis Cache server to hold refresh tokens
		token_storage.push(refresh_token)

		return res.status(200).json({"access": access_token, "refresh": refresh_token})
	}else{
		return res.status(401).json({"message": "Inavlid token"})
	}
})

// (POST) "/auth/server/refresh"
// Refreshes the access token. Takes in the refresh JWT in the authorization header
// || DONE ||
router.post("/refresh", (req, res) => {
	let auth_header: string | undefined = req.headers.authorization 				// Fetch the authorization header
	let refresh_jwt: string | undefined = auth_header?.split(" ")[1] 				// Refresh Token = (Token: Client ID, Secret: Server Refresh Token)
	let server_refresh_token: string | undefined = process.env.AUTH_SERVER_REFRESH 	// Fetch the server refresh token

	// Refresh token provided?
	if (refresh_jwt == undefined){ return res.status(400).json({"message": "No refresh token provided"}) }
	// Server refresh token available?
	if (server_refresh_token == undefined){ return res.status(500).json({"message": "Internal authorization error. Double check your cient token and internal server token"}) }

	// Is valid JWT? Return Data if so
	let [success, data]: Array<any> = verify_and_decode_jwt(refresh_jwt, String(server_refresh_token)) 

	// Invalid JWT
	if (!success){ return res.status(401).json({"message": "Invalid JWT"}) }
	
	// Invalid token in the JWT (this is an extreme case and prob will never happen)
	if (!validate_client_token(data.token, String(process.env.SERVER_ACCESS_TOKEN))){ return res.status(401).json({"message": "Invalid token"}) }

	// Generate new tokens
	let new_access_token: string = generate_new_jwt({token: data.token}, server_refresh_token, {expiresIn: '30s'})

	return res.status(200).json({
		"access_token": new_access_token,
		"expiresIn": "30s"
	})

})

// (POST) /auth/server/logout
// Logouts the specified client. Must provide refresh token else will return a 501
// || DONE(?) ||
router.post("/logout", (req, res) => {
	let auth_header: string | undefined = req.headers.authorization 				// Fetch the authorization header
	let refresh_jwt: string | undefined = auth_header?.split(" ")[1] 				// Will be the refresh token
	let server_refresh_token: string | undefined = process.env.AUTH_SERVER_REFRESH 	// Fetch the server access toke

	// Refresh token provided?
	if (refresh_jwt == undefined){ return res.status(400).json({"message": "No token provided"}) }
	// Server refresh token available?
	if (server_refresh_token == undefined){ return res.status(500).json({"message": "Internal authorization error. Double check your cient token and internal server token"}) }

	// Is valid JWT? Return data if so
	let [success, data]: Array<any> = verify_and_decode_jwt(refresh_jwt, String(server_refresh_token))

	// Invalid JWT
	if (!success){ return res.status(401).json({"message": "Invalid JWT"}) }
	
	// Invalid token in the JWT (this is an extreme case and prob will never happen)
	if (!validate_client_token(data.token, String(process.env.SERVER_ACCESS_TOKEN))){ return res.status(401).json({"message": "Invalid token"}) }
	
	// Token in storage?
	if (!token_storage.includes(refresh_jwt)){ return res.status(400).json({"message": "Token no longer valid. Logout already done"}) }

	// Remove token from storage
	token_storage.splice(token_storage.indexOf(refresh_jwt), 1)
	res.status(200).json({"success": true, "message": "Logout successful"})
})

module.exports = router
