// Imports
import { join } from 'path'
import { writeFile, existsSync, mkdir } from 'fs'

// Docstring
/**
 * Loopware Online Subsystem @ Logging Module
 * Simple logging module used by every Loss service
 */

// Classes

// Enums

// Interface

// Constants
const LOGGING_DIRECTORY_PATH: string = "./logs" // ./build/logs
const LOGGING_FILE_NAME: string = "logs.log"
const LOGGING_LOCALE: string = "eu"

// ENV Constants

// Public Variables

// Private Variables

// _init()
function _init(): void { _createLoggingDirectory() }

// Public Methods
/**
 * Logs a message to console and writes it to the log file
 * @param { Array<string> } logMessage - The messages to log
 * @returns { void } void
 */
export function log(...logMessages: Array<string>): void {
	// This is dirty but eh whatever
	let logDate: string = new Date().toLocaleDateString(LOGGING_LOCALE)
	let logTime: string = new Date().toLocaleTimeString(LOGGING_LOCALE)
	let logPrefix: string = `[LOG @ ${logDate} - ${logTime}]`
	let logSuffix: string = ""
	logMessages.forEach((message: string) => { logSuffix = logSuffix + message + " " })
	let fullLogMessage: string = `${logPrefix} ${logSuffix}`

	// Log to console
	console.log(fullLogMessage)

	// Write to file
	_writeToLogFile(fullLogMessage)
}

/**
 * Logs a message to console and writes it to the log file
 * @param { Array<string> } logMessage - The messages to log
 * @returns { void } void
 */
export function wrn(...logMessages: Array<string>): void {
	// This is dirty but eh whatever
	let logDate: string = new Date().toLocaleDateString(LOGGING_LOCALE)
	let logTime: string = new Date().toLocaleTimeString(LOGGING_LOCALE)
	let logPrefix: string = `[WRN @ ${logDate} - ${logTime}]`
	let logSuffix: string = ""
	logMessages.forEach((message: string) => { logSuffix = logSuffix + message + " " })
	let fullLogMessage: string = `${logPrefix} ${logSuffix}`

	// Log to console
	console.log(fullLogMessage)

	// Write to file
	_writeToLogFile(fullLogMessage)
}

/**
 * Logs a message to console and writes it to the log file
 * @param { Array<string> } logMessage - The messages to log
 * @returns { void } void
 */
export function err(...logMessages: Array<string>): void {
	// This is dirty but eh whatever
	let logDate: string = new Date().toLocaleDateString(LOGGING_LOCALE)
	let logTime: string = new Date().toLocaleTimeString(LOGGING_LOCALE)
	let logPrefix: string = `[ERR @ ${logDate} - ${logTime}]`
	let logSuffix: string = ""
	logMessages.forEach((message: string) => { logSuffix = logSuffix + message + " " })
	let fullLogMessage: string = `${logPrefix} ${logSuffix}`

	// Log to console
	console.log(fullLogMessage)

	// Write to file
	_writeToLogFile(fullLogMessage)
}

// Private Methods
/**
 * Creates a logging directory if not already created
 * @returns { void } void
 */
function _createLoggingDirectory(): void {
	let logDir: string = join(process.cwd(), LOGGING_DIRECTORY_PATH)
	if (existsSync(logDir)) { return; }
	mkdir(logDir, (error) => { if (error) { console.error(`Failed to create logging directory | ${error} `); return; } })
}

/**
 * Writes a log message to file
 * @param { string } logMessage - The message to write
 * @returns { void } void
 */
function _writeToLogFile(logMessage: string): void {
	let filePath: string = join(process.cwd(), LOGGING_DIRECTORY_PATH, LOGGING_FILE_NAME)
	writeFile(filePath, logMessage + "\n", { flag: 'a+' }, (error) => { if (error) { console.error(`Error while writing to log file | ${error}`); return; } })
}

// Callbacks

// Run
_init()