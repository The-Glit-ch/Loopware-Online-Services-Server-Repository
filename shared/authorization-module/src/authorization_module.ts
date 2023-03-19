// Imports
import https from 'https'
import http from 'http'
import { randomBytes, createHash } from 'crypto'
import { sign, SignOptions, verify } from 'jsonwebtoken'
import { err } from '../../logging-module/src/logging_module'
import { request, RequestOptions } from '../../requests-module/src/requests_module'

// Docstring
/**
 * Loopware Online Subsystem @ Authorization Module || Provides basic authorization utilities
 */

// Enums

// Interface
export interface NewClientIDData {
	clientToken: string,
	serverAccessToken: string,
	serverRefreshToken: string,
}

// Constants
const AUTHORIZATION_URL: string = "https://127.0.0.1:36210/authorization/_/authmodule/api/v1"

// ENV Constants

// Public Variables
/**
 * Generates a new client ID and its respective server access and refresh token pairs
 * @param { number } tokenSize - The byte size of the token `( Default 64 )`
 * @returns { NewClientIDData } The new Client ID data 
 */
export function generateNewClientID(tokenSize: number = 64): NewClientIDData {
	// Generate client token
	let clientID: string = randomBytes(tokenSize).toString('base64')

	// Generate salt || If needed set randomBytes param to "tokenSize/2"
	let saltFront: string = randomBytes(16).toString('base64')
	let saltBack: string = randomBytes(16).toString('base64')

	// Generate server access and refresh tokens
	let serverAccessToken: string = createHash('sha256').update(saltFront + clientID + saltBack).digest('base64')
	let serverRefreshToken: string = randomBytes(tokenSize).toString('base64')

	// Return data
	return {clientToken: clientID, serverAccessToken: serverAccessToken, serverRefreshToken: serverRefreshToken}
} 

/**
 * Generates a JSON Web Token (JWT)
 * @param { object } payload - The data the JWT should contain 
 * @param { string } secretKey - The secret the JWT should be encoded in
 * @param { SignOptions} options - Any other options the JWT should contain ( Refer to https://github.com/auth0/node-jsonwebtoken)
 * @returns { Promise<any> } Returns a promise with the new JWT
 */
export function generateJWT(payload: object, secretKey: string, options?: SignOptions): Promise<any> {
	return new Promise((resolve, reject) => {
		sign(payload, secretKey, options || {}, (error, token) => {
			if (error){ reject(error); }

			resolve(token)
		})
	})
}

/**
 * Decodes a JSON Web Token (JWT)
 * @param { string } token - The token to decode 
 * @param { string } secretKey - The key the token was encoded in
 * @returns { Promise<any> } Returns a promise with the decoded JWT
 */
export function decodeJWT(token: string, secretKey: string): Promise<any>{
	return new Promise((resolve, reject) => {
		verify(token, secretKey, (error, decodedToken) => {
			if (error){ reject(error) }

			resolve(decodedToken)
		})
	})
}

/**
 * Validates an access-client token pair
 * @param { string } accessToken - The access token 
 * @param { string } clientToken - The client token
 * @returns { Promise<object | any> } Returns a promise
 */
export function validateAccessToken(accessToken: string, clientToken: string): Promise<object | any>{
	// Hacky way of allowing self signed certs
	// In prod, official CA are MANDATORY
	let bypassAgent = new https.Agent({ rejectUnauthorized: false, requestCert: false, })
	
	// Set data
	let requestURL: string = AUTHORIZATION_URL + "/validate-access-token"
	let requestData: object = {tokens: {accessToken: accessToken, clientToken: clientToken}}
	let requestHeaders: http.OutgoingHttpHeaders = {'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(Buffer.from(JSON.stringify(requestData)))}

	return new Promise((resolve, reject) => {
		let requestOptions: RequestOptions = {
			requestURL: requestURL,
			requestMethod: 'GET',
			requestData: requestData,
			requestHeaders: requestHeaders,
			requestAgent: bypassAgent
		}

		request(requestOptions)
			.catch((error) => {
				err(`Error while doing validateAccessTokenRequest | ${error}`)
				reject({code: 500, message: "Internal error"})
			})
			.then((returnData: object | any) => {
				if (!returnData){ return; }
				resolve(returnData)
			})
	})
}

// Private Variables

// _init()

// Public Methods

// Private Methods

// Run