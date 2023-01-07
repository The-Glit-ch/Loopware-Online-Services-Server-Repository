// Imports
import express from 'express'
import { validateClientToken, generateJWT, verifyAndDecodeJWT } from '../../../../shared/authorization-module/src/authorization_module'
import { err } from '../../../../shared/logging-module/src/logging_module'

// Docstring

// Enums

// Constants
const router = express.Router()
const TOKEN_EXP_TIME: string | undefined = process.env.TOKEN_EXP_TIME 

// Public Variables
//TODO: Stop rewriting code and setup a proper database 
var tokenStorage: Array<string> = [] 

// Public Variables

// _init()

// Public Methods
/**
 * (POST) - /register || Authorization: Client Token
 * Registers a user to have access to the other subsystems (authorization must be enabled for it to work)
 * Client token must be provided in the Authorization header
 * Returns an access token (expiration is based on the .TOKEN_EXP_TIME environment variable) and a refresh token (does not expire)
 */
router.post("/register", (req, res) => {
	let authorizationHeader: string | undefined = req.headers.authorization
	let clientToken: string | undefined = authorizationHeader?.split(" ")[1]
	let serverAccessToken: string | undefined = process.env.SERVER_ACCESS_TOKEN
	let serverRefreshToken: string | undefined = process.env.SERVER_REFRESH_TOKEN

	// Client token provided?
	if (clientToken == undefined){ res.status(401).json({code: 401, message: "Client token not provided"}); return; }

	// Server access/refresh token available?
	if (serverAccessToken == undefined || serverRefreshToken == undefined){ res.status(500).json({code: 500, message: "Server token returned undefined"}); return; }

	// Client valid? If so generate new keys
	if (validateClientToken(clientToken, serverAccessToken)){
		generateJWT({token: clientToken}, serverAccessToken, {expiresIn: TOKEN_EXP_TIME})
			.catch((error) => {
				err(`Error while generating access token | ${error}`)
				res.status(500).json({code: 500, message: "Server error while generating access token"})
				return;
			})
			.then((access_token) => {
				generateJWT({token: clientToken}, String(serverRefreshToken))
					.catch((error) => {
						err(`Error while generating access token | ${error}`)
						res.status(500).json({code: 500, message: "Server error while generating refresh token"})
						return;
					})
					.then((refresh_token) => {
						tokenStorage.push(String(refresh_token))
						res.status(200).json({code: 200, message: {access_token: access_token, refresh_token: refresh_token}})
						return;
					})
			})
	}else{
		// Return 400 if client invalid
		res.status(400).json({code: 400, message: "Invalid client token"})
		return;
	}
})

/**
 * (POST) - /refresh || Authorization: Refresh Token
 * Refreshes the access token
 * Returns a new access token and the time it expires in
 */
router.post("/refresh", (req, res) => {
	let authorizationHeader: string | undefined = req.headers.authorization
	let refreshToken: string | undefined = authorizationHeader?.split(" ")[1]
	let serverRefreshToken: string | undefined = process.env.SERVER_REFRESH_TOKEN
	let serverAccessToken: string | undefined = process.env.SERVER_ACCESS_TOKEN

	// Refresh token provided?
	if (refreshToken == undefined){ res.status(401).json({code: 401, message: "Refresh token not provided"}); return; }
	
	// Server access/refresh token available?
	if (serverAccessToken == undefined || serverRefreshToken == undefined){ res.status(500).json({code: 500, message: "Server token returned undefined"}); return; }

	// Validate client
	verifyAndDecodeJWT(refreshToken, serverRefreshToken)
		.catch((error) => {
			err(`Error while decoding refresh token | ${error}`)
			res.status(401).json({code: 401, message: "Invalid token"})
			return;
		})
		.then((data) => {
			// Validate client token
			if (!data){ return; }
			if(validateClientToken(data.token, String(serverAccessToken))){
				generateJWT({token: data.token}, String(serverAccessToken), {expiresIn: TOKEN_EXP_TIME})
					.catch((error) => {
						err(`Error while generating access token | ${error}`)
						res.status(500).json({code: 500, message: "Server error while generating access token"})
						return;
					})
					.then((token) => {
						// Return new access token
						res.status(200).json({code: 200, message: {access_token: token, expires_in: TOKEN_EXP_TIME}})
						return;
					})
			}else{
				// Return 401 if invalid client token + JWT combo
				res.status(401).json({code: 401, message: "Invalid client token"})
				return;
			}
		})
})

/**
 * (POST) - /logout || Authorization: Refresh Token
 * Deregisters a client by revoking their refresh token 
 */
router.post("/logout", (req, res) => {
	let authorizationHeader: string | undefined = req.headers.authorization
	let refreshToken: string | undefined = authorizationHeader?.split(" ")[1]
	let serverRefreshToken: string | undefined = process.env.SERVER_REFRESH_TOKEN
	let serverAccessToken: string | undefined = process.env.SERVER_ACCESS_TOKEN

	// Refresh token provided?
	if (refreshToken == undefined){ res.status(401).json({code: 401, message: "Refresh token not provided"}); return; }

	// Server access/refresh token available?
	if (serverAccessToken == undefined || serverRefreshToken == undefined){ res.status(500).json({code: 500, message: "Server token returned undefined"}); return; }

	// Validate client
	verifyAndDecodeJWT(refreshToken, serverRefreshToken)
		.catch((error) => {
			err(`Error while decoding refresh token | ${error}`)
			res.status(401).json({code: 401, message: "Invalid token"})
			return;
		})
		.then((data) => {
			// Validate client token
			if (validateClientToken(data.clientToken.token, String(serverAccessToken))){
				// Fetch token
				let tokenIndex: number = tokenStorage.indexOf(String(refreshToken))
				// Check index of token
				if (tokenIndex == -1){ res.status(404).json({code: 404, message: "Already logged out"}); return; }
				// Remove the token
				tokenStorage.splice(tokenIndex, 1)

				res.status(200).json({code: 200, message: "Successful logout"})
				return;
			}else{
				res.status(401).json({code: 401, message: "Invalid client token"})
				return;
			}
		})
})

module.exports = router
