// Imports
import { randomBytes, createHash } from 'crypto'
import { sign, SignOptions, verify } from 'jsonwebtoken'

// Docstring
/**
 * Loopware Online Subsystem @ Authorization Module || Provides basic authorization utilities
 */

// Enums

// Interface
export interface newClientIDData {
	clientToken: string,
	serverAccessToken: string,
	serverRefreshToken: string
}

// Constants

// Public Variables
export function generateNewClientID(tokenSize: number = 64): newClientIDData {
	// Generate client token
	let clientID: string = randomBytes(tokenSize).toString('base64')

	// Generate server access and refresh tokens
	let serverAccessToken: string = createHash('sha256').update(clientID).digest('base64')
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

// Private Variables

// _init()

// Public Methods

// Private Methods

// Run
