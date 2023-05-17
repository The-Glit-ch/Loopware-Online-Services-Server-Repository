// Imports
import { createHash, randomBytes, BinaryToTextEncoding } from 'crypto';
import { SignOptions, sign, verify } from 'jsonwebtoken';

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
	/**
	 * Generates a new client token object
	 * @param { string } appName - The app name for the client token 
	 * @param { ClientAccessScopes } clientAccessScopes - The access scopes 
	 * @param { number } tokenSize - The size of the token `(Default: 64) `
	 * @returns { Promise<ClientTokenData> } ClientTokenData
	 */
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

	/**
	 * Generates a new JsonWebToken
	 * @param { object } payload - The payload for the JWT 
	 * @param { string} key - The key to be encoded with 
	 * @param { SignOptions | undefined } options - Additional options for the JWT
	 * @returns { Promise<string> } JWT
	 */
	public async generateJsonWebToken(payload: object, key: string, options?: SignOptions): Promise<string> { return sign(payload, key, options || {}); }

	/**
	 * Decodes a JsonWebToken
	 * @param { string } token - The token to decode 
	 * @param { string} key - The key to decode with 
	 * @returns { Promise<any> } Any
	 */
	public async decodeJsonWebToken(token: string, key: string): Promise<any> { return verify(token, key); }

	/**
	 * Checks if a client's current permissions match the required permissions
	 * @param { ClientAccessScopes } clientPermissions - The client's permissions
	 * @param { ClientAccessScopes } requiredPermissions - The required permissions 
	 * @returns { Promise<boolean> } Returns `true` if matching
	 */
	public async checkPermissionLevels(clientPermissions: ClientAccessScopes | any, requiredPermissions: ClientAccessScopes): Promise<boolean> {
		/**
		 * This is similar to how we did the "isInstanceOf" function in module/utility_module/module.ts with a slight
		 * variation
		 */
		for (const [key, value] of Object.entries(requiredPermissions)) {
			// Check if the target value is an object
			if (typeof value === 'object') {
				// Set the test value to match the current value
				const currentTestScope: any = clientPermissions[key]

				// Retrieve the current object keys
				const currentObjectKeys: Array<string> = Object.keys(value)

				// Start the recursive iteration
				for (let index in currentObjectKeys) {
					// Set the current key
					const currentKey: string = currentObjectKeys[index]

					// Set values
					let testValue: any = currentTestScope[currentKey]
					let requiredValue: any = value[currentKey]
					let currentRecursiveCount: number = 0

					// Check if we are comparing objects
					if (typeof requiredValue === 'object') {
						while (true) {
							// Keep going down until we are no longer an object
							while (typeof requiredValue === 'object') {
								testValue = (Object.values(testValue).length === 1) ? (Object.values(testValue)[0]) : (Object.values(testValue)[currentRecursiveCount])
								requiredValue = (Object.values(requiredValue).length === 1) ? (Object.values(requiredValue)[0]) : (Object.values(requiredValue)[currentRecursiveCount])
							}

							// Check we aren't reading beyond the scope
							if (requiredValue === undefined) { break; }

							// Check values
							/**
							 * Test value has to always match required value but required value does not have to match test value
							 * Ex:
							 * TestValue = False
							 * RequiredValue = True
							 * Conclusion: Deny permission
							 * 
							 * TestValue = True
							 * RequiredValue = False
							 * Conclusion: Allow permission
							*/
							if (testValue !== requiredValue && requiredValue === true) { return false; }

							// Reset values
							requiredValue = value[currentKey]
							testValue = currentTestScope[currentKey]

							// Increment count
							currentRecursiveCount++
						}
					} else {
						// Else just compare normally 
						if (testValue !== requiredValue && requiredValue === true) { return false; }
					}
				}
			}
			// Else just compare normally
			if (clientPermissions[key] !== value && value === true) { return false; }
		}
		// Managed to loop through the entire thing, return true
		return true
	}

	/**
	 * Returns the hash of the given data
	 * @param { any } data - The data to hash 
	 * @param { string } algorithm - The algorithm to use 
	 * @param { BinaryToTextEncoding } digest - The way the data should be digested(returned) 
	 * @returns { Promise<string> } String
	 */
	public async hash(data: any, algorithm: string = 'sha256', digest: BinaryToTextEncoding = 'base64'): Promise<string> { return createHash(algorithm).update(data).digest(digest); }
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