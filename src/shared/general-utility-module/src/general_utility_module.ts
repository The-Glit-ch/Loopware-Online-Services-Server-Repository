// Imports
import path from 'path'
import { readFileSync } from 'fs'

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
 * Checks if an object has an undefined key or value. Returns `true` if `undefined` is found
 * @param { object } object - The object to check
 * @returns { boolean } boolean
 */
export function objectNullCheck(object: object): boolean {
	Object.entries(object).forEach(([key, value]) => {
		if (key == undefined || value == undefined) { return true }
	})

	return false
}

/**
 * Returns the `key` and `cert` data from an internal specified file path
 * @returns { object } The `key` and `cert` data
 */
export function returnHTTPSCredentials(): object {
	let keyPath: string = path.join(process.cwd(), "/certs", "key.pem")
	let certPath: string = path.join(process.cwd(), "/certs", "cert.pem")

	let keyData = readFileSync(keyPath, 'utf-8')
	let certData = readFileSync(certPath, 'utf-8')

	return { key: keyData, cert: certData }
}

/**
 * Stringifies data with `JSON.stringify`
 * @param { any } data - The data to stringify 
 * @returns { string } Stringified Data
 */
export function stringifyData(data: any): string { return JSON.stringify(data) }

/**
 * Converts a JSON string into an object
 * @param { string } data - The data to parse
 * @returns { any } Object
 */
export function destringifyData(data: string): any { return JSON.parse(data) }

// Private Methods

// Run