// Imports
import { createHash } from 'crypto'
import { sign, SignOptions, verify } from 'jsonwebtoken'

// Docstring
/**
 * Loopware Online Subsystem @ Authorization Module || A simple module that provides utils for
 * handling Authorization
 */

// Enums

// Constants

// Public Variables

// Private Variables

// _init()

// Public Methods
/**
 * Checks the client token with the server access token. Returns true if valid
 * @param { string } clientToken The incoming client token to check
 * @param { string } serverAccessToken The server access token to compare too
 * @returns { boolean } Returns true or false
 */
export function validateClientToken(clientToken: string, serverAccessToken: string): boolean{
	let convertedToken: string = createHash('sha256').update(clientToken).digest('base64')
	return (convertedToken == serverAccessToken)
}

/**
 * Generates a new Json Web Token
 * @param { string } clientToken The client token being used 
 * @param { string } serverToken The server token to be encoded with
 * @param { SignOptions | undefined } options Optional options to be passed along 
 * @returns { Promise<string | undefined> } Returns a new Json Web Token
 */
export function generateJWT(clientToken: object, serverToken: string, options?: SignOptions): Promise<string | undefined>{
	return new Promise((resolve, reject) => {
		sign(clientToken, serverToken, options || {}, (error, token) => {
			if (error){ reject(error) }

			resolve(token)
		})
	})
}

/**
 * Verifies and decodes a JWT using the server token used to encode it with
 * @param { string } clientJWT The client JWT to decode
 * @param { string } serverToken The server token to decode with
 * @returns { Promise<any> } Returns a decoded JWT payload
 */
export function verifyAndDecodeJWT(clientJWT: string, serverToken: string): Promise<any> {
	return new Promise((resolve, reject) => {
		verify(clientJWT, serverToken, {}, (error, decoded) => {
			if (error){ reject(error) }

			resolve(decoded)
		})
	})
}

// Private Methods

// Run