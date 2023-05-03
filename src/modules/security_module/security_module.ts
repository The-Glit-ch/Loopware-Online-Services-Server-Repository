// Imports
import { createHash, randomBytes } from 'crypto';
import { SignOptions, sign } from 'jsonwebtoken';

// Docstring
/**
 * Loopware Online Subsystem @ Security Module
 * Provides functions used for authentication/authorization
 */

// Enums

// Interfaces
export interface ClientTokenData {
	appName: string,
	clientToken: string,
	serverAccessToken: string,
	serverRefreshToken: string,
	clientAccessScopes: ClientAccessScopes,
}

export interface ClientAccessScopes {
	web: { cosmicStorage: { datastoreService: boolean, leaderboardService: boolean, assetStreamingService: boolean, }, },
	net: { hypernetService: boolean, groundControlService: boolean, },
}

// Classes
export class LossSecurityModule {
	// Public Variables

	// Private Variables

	// Constructor

	// Public Static Methods
	public static async init(): Promise<LossSecurityModule> { return new LossSecurityModule(); }

	// Public Inherited Methods
	public async generateNewClientToken(appName: string, clientAccessScopes: ClientAccessScopes, tokenSize: number = 64): Promise<ClientTokenData> {
		// Generate a new client token
		const clientToken: string = randomBytes(tokenSize).toString('base64')

		// Generate salt
		const prefixSalt: string = randomBytes((tokenSize / 2)).toString('base64')
		const suffixSalt: string = randomBytes((tokenSize / 2)).toString('base64')

		// Generate server access and refresh tokens
		const serverAccessToken: string = createHash('sha256').update((prefixSalt + clientToken + suffixSalt)).digest('base64')
		const serverRefreshToken: string = randomBytes((tokenSize * 2)).toString('base64')

		// Return new client token data
		return { appName: appName, clientToken: clientToken, serverAccessToken: serverAccessToken, serverRefreshToken: serverRefreshToken, clientAccessScopes: clientAccessScopes, }
	}

	public async generateJsonWebToken(payload: object, key: string, options?: SignOptions): Promise<string> { return sign(payload, key, options || {}); }

	// Private Static Methods

	// Private Inherited Methods
}

// Constants

// Public Variables

// Private Variables

// _init()

// Public Methods

// Private Methods

// Run