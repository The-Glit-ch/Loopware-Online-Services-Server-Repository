// User endpoint

// Express
import express from 'express'
const router = express.Router()

// Authorization Module
import { validate_client_token, generate_new_jwt, verify_and_decode_jwt } from '../../../shared/auth/src/authorization_module'

// Token Storage
var token_storage: Array<string> = new Array<string> // TODO: Add a Redis Cache server to hold refresh tokens

// (POST) /auth/server
// Register for a new access token. Client token must be provided for token to be granted
router.post("/", (req, res) => {
	let auth_header: string |undefined = req.headers.authorization 					// Fetch the authorization header
	let client_token: string | undefined = auth_header?.split(" ")[1] 				// Client token. Used for registration of a new access token
	let server_access_token: string | undefined = process.env.AUTH_SERVER_ACCESS	// Fetch the server access token

	if (client_token == undefined){ return res.status(400).json({"message": "No authorization token provided"}) }
	if (server_token == undefined){ return res.status(500).json({"message": "Internal authorization error. Double check your cient token and internal server token"}) }

	if (validate_client_token(client_token, server_token)){
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
// Refresh access token
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
// Logout the client from server access. Client must register for a new access token if they want to re-access data
router.post("/logout", (req, res) => {
	let auth_header: string | undefined = req.headers.authorization // 
	let access_jwt: string | undefined = auth_header?.split(" ")[1] // Will be the refresh token
	let server_refresh_token: string | undefined = process.env.AUTH_SERVER_REFRESH

	if (access_jwt == undefined){ return res.status(400).json({"message": "No token provided"}) }
	if (server_refresh_token == undefined){ return res.status(500).json({"message": "Internal authorization error. Double check your cient token and internal server token"}) }

	let [success, data]: Array<any> = verify_and_decode_jwt(access_jwt, String(server_refresh_token))

	if (!success){ return res.status(401).json({"message": "Invalid JWT"}) }
	if (!validate_client_token(data.token, String(process.env.SERVER_ACCESS_TOKEN))){ return res.status(401).json({"message": "Invalid token"}) }
	if (!token_storage.includes(access_jwt)){ return res.status(400).json({"message": "Token no longer valid. Logout already done"}) }

	token_storage.splice(token_storage.indexOf(access_jwt), 1)
	res.status(200).json({"success": true, "message": "Logout successful"})
})

router.get("/check-access", (req, res) => {
	let auth_header: string | undefined = req.headers.authorization
	let client_jwt: string | undefined = auth_header?.split(" ")[1]
	let server_access_token: string | undefined = process.env.AUTH_SERVER_ACCESS

	if (client_jwt == undefined){ return res.status(400).json({"message": "No token provided"}) }
	if (server_access_token == undefined){ return res.status(500).json({"message": "Internal authorization error. Double check your cient token and internal server token"}) }

	let [success, data]: Array<any> = verify_and_decode_jwt(client_jwt, String(server_access_token))

	if (!success){ return res.status(401).json({"message": "Token expired / Invalid token"}) }

	res.status(200).json({"token_valid": success, "exp": data.exp, "iat": data.iat})
})


module.exports = router
