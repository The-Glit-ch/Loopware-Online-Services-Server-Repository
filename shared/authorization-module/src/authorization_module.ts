// Imports
import axios from 'axios'
import https from 'https'
import { randomBytes, createHash } from 'crypto'
import { sign, SignOptions, verify } from 'jsonwebtoken'

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

export function generateJWT(payload: object, secretKey: string, options?: SignOptions): Promise<any> {
	return new Promise((resolve, reject) => {
		sign(payload, secretKey, options || {}, (error, token) => {
			if (error){ reject(error); }

			resolve(token)
		})
	})
}

export function decodeJWT(token: string, secretKey: string): Promise<any>{
	return new Promise((resolve, reject) => {
		verify(token, secretKey, (error, decodedToken) => {
			if (error){ reject(error) }

			resolve(decodedToken)
		})
	})
}

export function validateAccessToken(accessToken: string, clientToken: string): Promise<any>{
	// Hacky way of allowing self signed certs
	// In prod, official CA are MANDATORY
	let bypassAgent = new https.Agent({
		rejectUnauthorized: false,
		requestCert: false,
	})

	return new Promise((resolve, reject) => {
		axios.get(AUTHORIZATION_URL + "/validate-access-token", {data: {tokens: {accessToken: accessToken, clientToken: clientToken}}, headers: {"Content-Type": "application/json"}, httpsAgent: bypassAgent})
			.catch((error) => {
				reject(error.response.data)
			})
			.then((returnData: any) => {
				if (!returnData){ return; }
				resolve(returnData.data.data)
			})
	})
}

// Private Variables

// _init()

// Public Methods

// Private Methods

// Run