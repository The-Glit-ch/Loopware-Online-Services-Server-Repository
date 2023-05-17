// Imports
import { join } from 'path'
import { access, constants, mkdir, writeFile } from 'fs/promises'

// Docstring
/**
 * Loopware Online Subsystem @ Logging Module
 * Simple logging module used by every Loss service
 */

// Enums

// Interfaces

// Classes
export class LossLoggingModule {
	// Private Variables
	private _loggingFileName: string
	private _loggingLocale: string
	private _currentLoggingDirectory: string

	// Constructor	
	constructor(loggingFileName: string, loggingLocale: string, currentLoggingDirectory: string) {
		// Set internal variables
		this._loggingFileName = loggingFileName
		this._loggingLocale = loggingLocale
		this._currentLoggingDirectory = currentLoggingDirectory
	}

	// Public Static Methods
	/**
	 * Initializes and returns a new `LossLoggingModule` instance
	 * @param { string } directoryPath - The path where logs should be stored
	 * @param { string } fileName - The file name of the log file
	 * @param { string } locale - The locale of the logging text 
	 * @returns { Promise<LossLoggingModule> } Promise
	 */
	public static async init(directoryPath: string = "./logs", fileName: string = "log.log", locale: string = "eu"): Promise<LossLoggingModule> {
		// Set the current logging directory
		const currentLoggingDirectory: string = join(process.cwd(), directoryPath)

		// Create logging directory
		await this._createLoggingDirectory(currentLoggingDirectory)

		// Return a new instance
		return new LossLoggingModule(fileName, locale, currentLoggingDirectory)
	}

	// Public Instanced Methods
	/**
	 * Logs a message to stdout and to a log file
	 * @param { Array<string> } messages - The message(s) to log
	 * @returns { Promise<void> } Promise 
	 */
	public async log(...messages: Array<string>): Promise<void> {
		const logDate: string = new Date().toLocaleDateString(this._loggingLocale)
		const logTime: string = new Date().toLocaleTimeString(this._loggingLocale)
		const logPrefix: string = `[LOG @ ${logTime} - ${logDate}]`
		let logSuffix: string = ""
		messages.forEach((logMessage: string) => { logSuffix = logSuffix + logMessage + " " })
		const fullLogMessage: string = `${logPrefix} ${logSuffix}`

		// Log to console
		console.log(fullLogMessage)

		// Write to file
		this._writeToLogFile(fullLogMessage)
		return
	}

	/**
	 * Logs a warning message to stdout and to a log file
	 * @param { Array<string> } messages - The message(s) to log
	 * @returns { Promise<void> } Promise 
	 */
	public async wrn(...messages: Array<string>): Promise<void> {
		const logDate: string = new Date().toLocaleDateString(this._loggingLocale)
		const logTime: string = new Date().toLocaleTimeString(this._loggingLocale)
		const logPrefix: string = `[WRN @ ${logTime} - ${logDate}]`
		let logSuffix: string = ""
		messages.forEach((logMessage: string) => { logSuffix = logSuffix + logMessage + " " })
		const fullLogMessage: string = `${logPrefix} ${logSuffix}`

		// Log to console
		console.log(fullLogMessage)

		// Write to file
		this._writeToLogFile(fullLogMessage)
		return
	}

	/**
	 * Logs an error message to stdout and to a log file
	 * @param { Array<string> } messages - The message(s) to log
	 * @returns { Promise<void> } Promise 
	 */
	public async err(...messages: Array<string>): Promise<void> {
		const logDate: string = new Date().toLocaleDateString(this._loggingLocale)
		const logTime: string = new Date().toLocaleTimeString(this._loggingLocale)
		const logPrefix: string = `[ERR @ ${logTime} - ${logDate}]`
		let logSuffix: string = ""
		messages.forEach((logMessage: string) => { logSuffix = logSuffix + logMessage + " " })
		const fullLogMessage: string = `${logPrefix} ${logSuffix}`

		// Log to console
		console.log(fullLogMessage)

		// Write to file
		this._writeToLogFile(fullLogMessage)
		return
	}

	// Private Static Methods
	/**
	 * Creates a logging directory for log files
	 * @param { string } filePath - The path of the logging directory
	 * @returns { void } void
	 */
	private static async _createLoggingDirectory(filePath: string): Promise<void> {
		return access(filePath, constants.F_OK).catch((_: Error) => { mkdir(filePath).catch((error: Error) => { console.error(`Error while making logging directory | ${error}`); }); })
	}

	// Private Instanced Methods
	/**
	 * Writes a log message to the log file
	 * @param { string } logMessage - The message to write
	 * @returns { void } void
	 */
	private async _writeToLogFile(logMessage: string): Promise<void> {
		const filePath: string = join(this._currentLoggingDirectory, this._loggingFileName)
		return writeFile(filePath, logMessage + "\n", { flag: 'a+', }).catch((error: Error) => { console.error(`Error while writing log to file | ${error}`); })
	}
}

// Constants

// Public Variables

// Private Variables

// _init()

// Public Methods

// Private Methods

// Run