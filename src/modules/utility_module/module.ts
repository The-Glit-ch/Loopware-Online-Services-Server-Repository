// Imports
import { join } from 'path';
import { readFile } from 'fs/promises';

// Docstring
/**
 * Loopware Online Subsystem @ Utility Module
 * Provides custom helper/utility functions that are widely used
 */

// Classes
export class LossUtilityModule {
	// Public Variables

	// Private Variables

	// Constructor

	// Public Static Methods
	public static async init(): Promise<LossUtilityModule> { return new LossUtilityModule(); }

	// Public Inherited Methods
	/**
	 * Returns the HTTPS certificate data from the given directory
	 * @param { string } directoryPath - The directory where the certificates are located
	 * @returns { Promise<HTTPSCertificateData> } HTTPSCertificateData
	 */
	public async returnHTTPSCertificates(directoryPath: string = "./certs"): Promise<HTTPSCertificateData> {
		// Save file paths
		const keyPath: string = join(process.cwd(), directoryPath, "privatekey.pem")
		const certPath: string = join(process.cwd(), directoryPath, "certificate.pem")

		const keyData: string | void = await readFile(keyPath, { encoding: 'utf-8', }).catch((error: Error) => { throw error; })
		const certData: string | void = await readFile(certPath, { encoding: 'utf-8', }).catch((error: Error) => { throw error; })

		if (keyData && certData) { return ({ keyData: keyData, certData: certData, }); }
		return { keyData: "", certData: "", }
	}

	/**
	 * Validates a given object making sure `null` or `undefined` or not present
	 * @param { object } object - The object to check
	 * @returns { Promise<boolean> } `True` if the object is valid, `False` if the object is not valid
	 */
	public async validateObject(object: object): Promise<boolean> {
		Object.entries(object).forEach(async ([key, value]) => { if (key === undefined || value === undefined) { return false; }; })
		return true
	}

	/**
	 * Compares two objects to see if they have the same structure
	 * @description Note: This is VERY semi-inefficient and homophobic
	 * @see https://stackoverflow.com/questions/14425568/interface-type-check-with-typescript
	 * @param { object } test - The object to test 
	 * @param { object } target - The object to match 
	 * @returns { Promise<boolean> } Returns ``true`` if matching else ``false``
	 */
	public async isInstanceOf(test: object | any, target: object): Promise<boolean> {
		// Check object keys length
		if (Object.keys(test).length != Object.keys(target).length) { return false; }

		// Check if the objects are valid
		if (await !this.validateObject(test) || await !this.validateObject(target)) { return false; }

		// Check individual types		
		for (const [targetKey, targetValue] of Object.entries(target)) {
			// Check if the test object has X key
			if (!Object.hasOwn(test, targetKey)) { return false; }

			// Begin value matching //

			// Check if the target value is actually an object
			if (typeof targetValue == 'object') {
				// Check if the test value is also an object
				if (typeof test[targetKey] != 'object') { return false; }

				// Start recursively iterating
				const testValue: any = test[targetKey]
				const targetKeys: Array<string> = Object.keys(targetValue)

				// Took me 5hrs...why is this not implemented natively
				for (let index in targetKeys) {
					const key: string = targetKeys[index]
					let recursiveCount: number = 0
					let targetCursor: any = targetValue[key]
					let testCursor: any = testValue[key]

					while (true) {
						while (typeof targetCursor == 'object') {
							if (typeof testCursor != 'object') { return false; }
							targetCursor = (Object.values(targetCursor).length == 1) ? (Object.values(targetCursor)[0]) : (Object.values(targetCursor)[recursiveCount])
							testCursor = (Object.values(testCursor).length == 1) ? (Object.values(testCursor)[0]) : (Object.values(testCursor)[recursiveCount])
						}
						// Check we aren't reading beyond scope
						if (targetCursor === undefined) { break; }

						// Check types
						if (typeof testCursor != typeof targetCursor) { return false; }

						// Reset cursors
						targetCursor = targetValue[key]
						testCursor = testValue[key]

						// Increment count
						recursiveCount++
					}
				}
				// Looped through each key so we're good
				return true
			}
			// Target value not an object just check types normally
			if (typeof test[targetKey] != typeof targetValue) { return false; }
		}
		return false
	}

	/**
	 * Returns a token from a given authorization header
	 * @param { string } authorizationHeader - The authorization header
	 * @param { boolean} isDual - Does the header contain dual tokens? 
	 * @param { string } delimiter - Where should the token be split (applies for isDual) 
	 * @returns { Promise<Array<string> | string> } Promise
	 */
	public async returnToken(authorizationHeader: string, isDual: boolean = false, delimiter: string = ":"): Promise<Array<string> | string> {
		if (isDual){ return authorizationHeader.split(" ")[1].split(delimiter); }
		return authorizationHeader.split(" ")[1]
	}

	// Private Static Methods

	// Private Inherited Methods
}

// Enums

// Interfaces
export interface HTTPSCertificateData {
	keyData: string,
	certData: string,
}

// Constants

// Public Variables

// Private Variables

// _init()

// Public Methods

// Private Methods

// Run