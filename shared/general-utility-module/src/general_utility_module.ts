// Imports
import { readFileSync } from 'fs'
import path, { join } from 'path'

// Docstring
/**
 * Loopware Online Subsystems @ General Utility Module || A simple utility module that provides common custom functions used
 * throughout Loss
 */

// Enums

// Interface

// Constants

// ENV Constants

// Public Variables

// Private Variables

// _init()

// Public Methods
/**
 * Checks if an object has an undefined key or value. Returns `true`
 * if `undefined` is found
 * @param { object } object - The object to check
 * @returns { boolean } boolean
 */
export function objectNullCheck(object: object): boolean{
	Object.entries(object).forEach(([key, value]) => {
		if (key == undefined || value == undefined){ return true }
	})
	
	return false
}

/**
 * Returns the `key` and `cert` data from a specified file path
 * @param { string } certificatePath - The path were the certificates are located
 * @returns { object } The `key` and `cert`
 */
export function returnHTTPSCredentials(certificatePath: string): object {
	let keyPath: string = path.join(certificatePath, "key.pem")
	let certPath: string = path.join(certificatePath, "cert.pem")
	
	let keyData = readFileSync(keyPath, 'utf-8')
	let certData = readFileSync(certPath, 'utf-8')

	return {key: keyData, cert: certData}
}

// Private Methods

// Run