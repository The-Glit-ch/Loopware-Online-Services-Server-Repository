// Imports
import { writeFile, mkdirSync, existsSync } from 'fs'
import { join } from 'path'

// Docstring
/**
 * Loopware Online Subsystem @ Logging Module || A simple to use logging module that can be customized
 * and changed to your hearts content
 */

// Enums

// Constants
const loggingLocale: string = 'en-US'
const loggingDirectory: string = './logs'
const loggingFileName: string = new Date().toLocaleString(loggingLocale)
	.replaceAll("/", "-")
	.replaceAll(",", "_")
	.replaceAll(":", ".")

// Public Variables

// Private Variables

// _init()
function _init(): void{
	// Check and/or create a logging directory
	_checkForLoggingDirectory()
}

// Public Methods
/**
 * Logs a message to stdout and writes it to file
 * @param { Array<string> } message - Message to log
 */
export function log(...message: Array<string>): void{
	let logTime: string = new Date().toLocaleDateString(loggingLocale)
	let formattedMessage: string = `[LOG @ ${logTime}] ${message.toString().replaceAll(",", " ")}`

	console.log(formattedMessage)
	_writeToLogFile(formattedMessage)
		.catch((err) => {
			console.error(`ERROR WRITING LOG FILE || ${err}`)
		})
}

/**
 * Logs a warning message to stdout and writes it to file
 * @param { Array<string> } message - Message to log
 */
export function wrn(...message: Array<string>): void{
	let logTime: string = new Date().toLocaleDateString(loggingLocale)
	let formattedMessage: string = `[WRN @ ${logTime}] ${message.toString().replaceAll(",", " ")}`

	console.log(formattedMessage)
	_writeToLogFile(formattedMessage)
		.catch((err) => {
			console.error(`ERROR WRITING LOG FILE || ${err}`)
		})
}

/**
 * Logs an error message to stdout and writes it to file
 * @param { Array<string> } message - Message to log
 */
export function err(...message: Array<string>): void{
	let logTime: string = new Date().toLocaleDateString(loggingLocale)
	let formattedMessage: string = `[ERR @ ${logTime}] ${message.toString().replaceAll(",", " ")}`

	console.log(formattedMessage)
	_writeToLogFile(formattedMessage)
		.catch((err) => {
			console.error(`ERROR WRITING LOG FILE || ${err}`)
		})
}

// Private Methods
/**
 * Checks if there is a valid logging directory
 * If false, it creates a new logging directory
 * specified in loggingDirectory constant
 * @returns void
 */
function _checkForLoggingDirectory(): void{
	let path: string = join(process.cwd(), loggingDirectory)
	let exists: boolean = existsSync(path)

	if (!exists){ mkdirSync(path) }

	return
}

/**
 * Writes data to a log file
 * @param { string } data - Data that should be written to the file. Must be a string
 * @returns void
 */
function _writeToLogFile(data: string): Promise<void>{
	let path: string = join(process.cwd(), loggingDirectory, loggingFileName)

	return new Promise((_, reject) => {
		writeFile(path, `${data}\n`, {flag: 'a+'}, (err) => {
			if (err){ reject(err) }
		})
	})
}

// Run
_init()
