// Imports
import { randomBytes, createHash } from 'crypto'
import { SignOptions, sign } from 'jsonwebtoken'

// Docstring
/**
 * Loopware Online Subsystem @ Authorization Module
 * Provides authorization/authentication utilities for Loss
 */

// Classes

// Enums

// Interface
export interface AccessScopes {
	database: { datastore: boolean, leaderboard: boolean, assetStream: boolean, } | boolean,
	networking: { hypernet: boolean, voip: boolean, } | boolean,
}

export interface ClientTokenData {
	appName: string,
	clientToken: string,
	serverAccessToken: string,
	serverRefreshToken: string,
	clientAccessScopes: AccessScopes,
}

// Constants

// ENV Constants

// Public Variables

// Private Variables
export function generateClientToken(appName: string, tokenSize: number = 64, accessScopes: AccessScopes): Promise<ClientTokenData> {
	return new Promise((resolve, _reject) => {
		let prefixSalt: string = randomBytes((tokenSize / 2)).toString('utf-8')
		let suffixSalt: string = randomBytes((tokenSize / 2)).toString('utf-8')
		let newClientToken: string = randomBytes(tokenSize).toString('utf-8')
		let serverAccessToken: string = createHash('sha256').update((prefixSalt + newClientToken + suffixSalt)).digest('base64')
		let serverRefreshToken: string = randomBytes(tokenSize).toString('utf-8')

		resolve({ appName: appName, clientToken: newClientToken, serverAccessToken: serverAccessToken, serverRefreshToken: serverRefreshToken, clientAccessScopes: accessScopes })
	})
}

export function generateJWT(payload: object, key: string, options?: SignOptions): Promise<Error | string> {
	return new Promise((resolve, reject) => {
		sign(payload, key, options || {}, (error: Error | null, token: string | undefined) => {
			if (error) { reject(error); }
			if (token) { resolve(token); }
		})
	})
}

export function decodeJWT(): void {

}

// _init()

// Public Methods

// Private Methods

// Callbacks

// Run