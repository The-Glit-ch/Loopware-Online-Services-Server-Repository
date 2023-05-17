// Imports
import { join } from 'path';
import { readFile, access, constants } from 'fs/promises';

// Docstring
/**
 * Loopware Online Subsystem @ Utility Module
 * Provides custom helper/utility functions that are widely used
 */

// Enums

// Interfaces
export interface HTTPSCertificateData {
	keyData: string,
	certData: string,
}

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
	 * @description Note: This can only compare types for now..no key checking
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
		for (const [key, value] of Object.entries(target)) {
			// Check if the target value is an object
			if (typeof value === 'object') {
				// Set the test scope to match the current scope
				const currentTestScope: any = test[key]

				// Retrieve the current target and test object keys
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
						// Check the test value is also an object
						if (typeof testValue !== 'object') { return false; }

						while (true) {
							// Keep going down until we are no longer an object type
							while (typeof requiredValue === 'object') {
								if (typeof testValue !== 'object') { return false; }
								testValue = (Object.values(testValue).length === 1) ? (Object.values(testValue)[0]) : (Object.values(testValue)[currentRecursiveCount])
								requiredValue = (Object.values(requiredValue).length === 1) ? (Object.values(requiredValue)[0]) : (Object.values(requiredValue)[currentRecursiveCount])
							}

							// Check we aren't reading beyond scope
							if (requiredValue === undefined) { break; }

							// Compare types and keys
							if (typeof testValue !== typeof requiredValue) { return false; }

							// Reset values
							requiredValue = value[currentKey]
							testValue = currentTestScope[currentKey]

							// Increment counter
							currentRecursiveCount++
						}
					} else {
						// Else just compare normally
						if (typeof testValue !== typeof requiredValue) { return false; }
					}
				}
			}
			// Else just compare normally
			if (typeof test[key] !== typeof value) { return false; }
		}
		// Managed to loop through the entire thing, return true
		return true
	}

	/**
	 * Returns a token from a given authorization header
	 * @param { string } authorizationHeader - The authorization header
	 * @param { boolean} isDual - Does the header contain dual tokens? 
	 * @param { string } delimiter - Where should the token be split (applies for isDual) 
	 * @returns { Promise<Array<string> | string> } Promise
	 */
	public async returnToken(authorizationHeader: string, isDual: boolean = false, delimiter: string = ":"): Promise<Array<string> | string> {
		if (isDual) { return authorizationHeader.split(" ")[1].split(delimiter); }
		return authorizationHeader.split(" ")[1]
	}

	/**
	 * Checks if a given filepath exists
	 * @param { string } filePath - The filepath to check
	 * @returns { Promise<boolean | void> } Boolean 
	 */
	public async filePathExists(filePath: string): Promise<boolean> {
		let fp: string = join(process.cwd(), filePath)
		try { await access(fp, constants.F_OK); return true; }
		catch { return false; }
	}

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