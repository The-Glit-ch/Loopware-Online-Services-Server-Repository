// Imports
import { writeFile, mkdirSync, existsSync } from 'fs'
import { join } from 'path'

// Docstring
/**
 * Loopware Online Subsystem @ Logging Module || A simple to use logging module that can be customized
 * and changed to your hearts content
 */

// Enums

// Interface

// Constants
const loggingLocale: string = 'en-US'
const loggingDirectory: string = './logs'
const loggingFileName: string = new Date().toLocaleString(loggingLocale)
	.replaceAll("/", "-")
	.replaceAll(",", "_")
	.replaceAll(":", ".")
	+ ".log"

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
 * @returns { void } void
 */
export function log(...message: Array<string>): void{
	let logDate: string = new Date().toLocaleDateString(loggingLocale)
	let logTime: string = new Date().toLocaleTimeString(loggingLocale)
	let fullMessage: string = ""
	message.forEach((value) => {fullMessage = fullMessage + " " + value})
	let formattedMessage: string = `[LOG @ ${logDate}-${logTime} | ${_getCallerFile()}] ${fullMessage}`

	console.log(formattedMessage)
	_writeToLogFile(formattedMessage)
		.catch((err) => {
			console.error(`ERROR WRITING LOG FILE || ${err}`)
		})
}

/**
 * Logs a warning message to stdout and writes it to file
 * @param { Array<string> } message - Message to log
 * @returns { void } void
 */
export function wrn(...message: Array<string>): void{
	let logDate: string = new Date().toLocaleDateString(loggingLocale)
	let logTime: string = new Date().toLocaleTimeString(loggingLocale)
	let fullMessage: string = ""
	message.forEach((value) => {fullMessage = fullMessage + " " + value})
	let formattedMessage: string = `[WRN @ ${logDate}-${logTime} | ${_getCallerFile()}] ${fullMessage}`

	console.log(formattedMessage)
	_writeToLogFile(formattedMessage)
		.catch((err) => {
			console.error(`ERROR WRITING LOG FILE || ${err}`)
		})
}

/**
 * Logs an error message to stdout and writes it to file
 * @param { Array<string> } message - Message to log
 * @returns { void } void
 */
export function err(...message: Array<string>): void{
	let logDate: string = new Date().toLocaleDateString(loggingLocale)
	let logTime: string = new Date().toLocaleTimeString(loggingLocale)
	let fullMessage: string = ""
	message.forEach((value) => {fullMessage = fullMessage + " " + value})
	let formattedMessage: string = `[ERR @ ${logDate}-${logTime} | ${_getCallerFile()}] ${fullMessage}`

	console.log(formattedMessage)
	_writeToLogFile(formattedMessage)
		.catch((err) => {
			console.error(`ERROR WRITING LOG FILE || ${err}`)
		})
}

// Private Methods
/**
 * Checks if there is a valid logging directory.
 * If false, it creates a new logging directory
 * specified in loggingDirectory constant
 * @returns { void } void
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
 * @returns { void } void
 */
function _writeToLogFile(data: string): Promise<void>{
	let path: string = join(process.cwd(), loggingDirectory, loggingFileName)

	return new Promise((_, reject) => {
		writeFile(path, `${data}\n`, {flag: 'a+'}, (err) => {
			if (err){ reject(err) }
		})
	})
}

/**
 * I don't even know
 * @returns { string } File name
 */
function _getCallerFile(): string{
	// Black magic fuckery like holy shit
	// https://www.appsloveworld.com/nodejs/100/8/nodejs-get-filename-of-caller-function
	// https://stackoverflow.com/questions/14201475/node-js-getting-current-filename

	// Setup
    let error: Error = new Error()
	let stack: any

	// Prepare the stack
    Error.prepareStackTrace = (_, stack) => stack;

	// ????
	stack = error.stack
	Error.prepareStackTrace = undefined;

	// Save the file path
	let rawFileString: string = String(stack[2].getFileName())
	let formattedFileString: string = rawFileString.slice(rawFileString.lastIndexOf(require('path').sep)+1, rawFileString.length) // ???????

	return formattedFileString
}

// Run
_init()
