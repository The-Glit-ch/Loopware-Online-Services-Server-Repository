// User endpoint

// Express
import express from 'express'
const router = express.Router()

// Authorization Module
import { validate_client_token, generate_new_jwt, verify_and_decode_jwt } from '../../../shared/auth/src/authorization_module'

// Logger
import { log } from '../../../shared/logger/src/logging_module'

// Token Storage
var token_storage: Array<string> = new Array<string> //TODO: Setup a redis cache for this

router.use((req, res, next) => {
	log(`New "${req.protocol.toUpperCase()}" connection to "${req.baseUrl + req.url}" from "${req.ip}" using "${req.method.toUpperCase()}"`)
	next()
})

// (POST) /auth/server
// Register for a new access token. Client token must be provided for token to be granted
router.post("/", (req, res) => {
	let auth_header: string |undefined = req.headers.authorization
	let client_token: string | undefined = auth_header?.split(" ")[1]
	let server_token: string | undefined = process.env.AUTH_SERVER_ACCESS

	if (client_token == undefined){ return res.status(400).json({"message": "No authorization token provided"}) }
	if (server_token == undefined){ return res.status(500).json({"message": "Internal authorization error. Double check your cient token and internal server token"}) }

	if (validate_client_token(client_token, server_token)){
		let access_token: string = generate_new_jwt({token: client_token}, String(process.env.AUTH_SERVER_ACCESS), {expiresIn: '15s'}) 	// Can expire, Client Token + Server Access Token
		let refresh_token: string = generate_new_jwt({token: client_token}, String(process.env.AUTH_SERVER_REFRESH)) 					// Dosent expire, CLient Token + Refresh Access Token

		token_storage.push(refresh_token)
		return res.status(200).json({"access": access_token, "refresh": refresh_token})
	}else{
		return res.status(401).json({"message": "Inavlid token"})
	}
})

// (POST) /auth/server/logout
// Logout the client from server access. Client must register for a new access token if they want to re-access data
router.post("/logout", (req, res) => {
	let auth_header: string | undefined = req.headers.authorization
	let client_jwt: string | undefined = auth_header?.split(" ")[1] // Will be the refresh token
	let server_refresh_token: string | undefined = process.env.AUTH_SERVER_REFRESH

	if (client_jwt == undefined){ return res.status(400).json({"message": "No token provided"}) }
	if (server_refresh_token == undefined){ return res.status(500).json({"message": "Internal authorization error. Double check your cient token and internal server token"}) }

	let [success, data]: Array<any> = verify_and_decode_jwt(client_jwt, String(server_refresh_token))

	if (!success){ return res.status(401).json({"message": "Invalid token"}) }
	if (!token_storage.includes(client_jwt)){ return res.status(400).json({"message": "Token no longer valid. Logout already done"}) }

	token_storage.splice(token_storage.indexOf(client_jwt), 1)
	res.status(200).json({"success": true, "message": "Logout successful"})
})

router.get("/check-access", (req, res) => {
	let auth_header: string | undefined = req.headers.authorization
	let client_jwt: string | undefined = auth_header?.split(" ")[1]
	let server_token: string | undefined = process.env.AUTH_SERVER_ACCESS

	if (client_jwt == undefined){ return res.status(400).json({"message": "No token provided"}) }
	if (server_token == undefined){ return res.status(500).json({"message": "Internal authorization error. Double check your cient token and internal server token"}) }

	let [success, data]: Array<any> = verify_and_decode_jwt(client_jwt, String(server_token))

	if (!success){ return res.status(401).json({"message": "Token expired / Invalid token"}) }

	res.status(200).json({"token_valid": success, "exp": data.exp, "iat": data.iat})
})


module.exports = router
