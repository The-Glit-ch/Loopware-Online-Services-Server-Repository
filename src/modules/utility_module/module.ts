// Imports
import { join } from 'path'
import { readFileSync } from 'fs'

// Docstring
/**
 * Loopware Online Subsystem @ Utility Module
 * Provides helper functions and other things for every Loss service
 */

// Classes

// Enums

// Interface
export interface CertificateCredentials {
	key: string,
	cert: string,
}

// Constants
const DIRECTORY_NAME: string = "certs"
const KEY_FILE_NAME: string = "privatekey.pem"
const CERTIFICATE_FILE_NAME: string = "certificate.pem"

// ENV Constants

// Public Variables

// Private Variables

// _init()

// Public Methods
/**
 * Returns the privatekey and certificate data
 * @returns { CertificateCredentials } The certificate credentials
 */
export function returnCertificateCredentials(): CertificateCredentials {
	let keyPath: string = join(process.cwd(), DIRECTORY_NAME, KEY_FILE_NAME)
	let certPath: string = join(process.cwd(), DIRECTORY_NAME, CERTIFICATE_FILE_NAME)

	let keyData: string = readFileSync(keyPath, 'utf8')
	let certData: string = readFileSync(certPath, 'utf8')

	return { key: keyData, cert: certData, }
}

/**
 * Serializes data for data transfer via `JSON.stringify`
 * @param { any } data - The data to serialize
 * @returns { string } The serialized data 
 */
export function serializeData(data: any): string { return JSON.stringify(data); }

/**
 * De-serializes data into a valid JS/TS object via `JSON.parse`
 * @param { any } data - The data to deserialize
 * @returns { any } The deserialized data
 */
export function deserializeData(data: any): any { return JSON.parse(data); }

/**
 * Returns the content length of a buffer string in bytes
 * @param { any } data - Data
 * @returns { number } The length in bytes
 */
export function returnContentLength(data: any): number { return Buffer.byteLength(Buffer.from(serializeData(data))); }

/**
 * Checks if a given object has a null/undefined key/value pair
 * @param { object } object - The object to check
 * @returns { boolean } True if an object has a undefined value, False if it contains none
 */
export function objectNullCheck(object: object): boolean {
	Object.entries(object).forEach(([key, value]) => { if (key === undefined || value === undefined) { return true; }; })
	return false
}
// Private Methods

// Callbacks

// Run