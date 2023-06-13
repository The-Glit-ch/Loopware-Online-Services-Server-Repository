// Imports
import { join } from 'path';
import { access, constants, mkdir, writeFile } from 'fs/promises';


// Docstring
/**
 * Loopware Online Subsystem Server @ Loss Logging Module
 * A generic and simple logging module for all Loss services
 */

// Enums
enum LogType {
	fatal = "FATAL",
	error = "ERROR",
	warning = "WARNING",
	info = "INFO",
	debug = "DEBUG",
}

// Interfaces

// Classes
export class LossLoggingModule {
	// Public Variables

	// Private Variables
	private _lossLoggingDirectory: string
	private _lossLoggingFileName: string
	private _lossLoggingLocale: string
	private _lossEnableDebugMode: boolean
	private _logMessageFormat: string = `[%LOG_TYPE% @ %LOG_TIME% - %LOG_DATE%]`

	// Constructor
	constructor(lossLoggingDirectory: string, lossLoggingFileName: string, lossLoggingLocale: string, lossEnableDebugMode: boolean) {
		// Set private variables
		this._lossLoggingDirectory = lossLoggingDirectory
		this._lossLoggingFileName = lossLoggingFileName
		this._lossLoggingLocale = lossLoggingLocale
		this._lossEnableDebugMode = lossEnableDebugMode
	}

	// Public Static Methods
	/**
	 * Creates an initializes a new `LossLoggingModule`
	 * @param { string } lossLoggingDirectory - The directory where log files should be stored  
	 * @param { string } lossLoggingFileName - The log file name 
	 * @param { string } lossLoggingLocale - The locale of the time 
	 * @param { boolean } lossEnableDebugMode - Enable/disable debugging logs
	 * @returns 
	 */
	public static async init(lossLoggingDirectory: string = "./logs", lossLoggingFileName: string = "log.log", lossLoggingLocale: string = "eu", lossEnableDebugMode: boolean = false): Promise<LossLoggingModule> {
		// Get the full directory path
		const fullLossLoggingDirectoryPath: string = join(process.cwd(), lossLoggingDirectory)

		// Create the logging directory
		await this._createLossLoggingDirectory(fullLossLoggingDirectoryPath)

		// Return a new LossLoggingModule instance
		return new LossLoggingModule(fullLossLoggingDirectoryPath, lossLoggingFileName, lossLoggingLocale, lossEnableDebugMode)
	}

	// Public Inherited Methods
	/**
	 * Allows the setting of `lossEnableDebugMode`
	 * @param { boolean } value - The new value to set 
	 * @returns { Promise<void> } void
	 */
	public async setLossEnableDebugMode(value: boolean): Promise<void> {
		this._lossEnableDebugMode = value
		return
	}

	/**
	 * Logs a fatal error message to stdout and the log file
	 * @param { Array<string> | string } logMessages - The log message(s)
	 * @returns { Promise<void> } void
	 */
	public async fatal(...logMessages: Array<string>): Promise<void> {
		// Get the log times
		const logTime: string = new Date().toLocaleTimeString(this._lossLoggingLocale)
		const logDate: string = new Date().toLocaleDateString(this._lossLoggingLocale)

		// Format the prefix of the log message
		const logMessagePrefix: string = await this._formatLogMessagePrefix(LogType.fatal, logTime, logDate)

		// Combine the log messages into a single message
		let logMessageSuffix: string = ""
		logMessages.forEach((logMessage: string) => { logMessageSuffix += (logMessage + " "); })

		// Combine the log prefix with the suffix
		const fullLogMessage: string = `${logMessagePrefix} ${logMessageSuffix}`

		// Log the message to console
		console.log(fullLogMessage)

		// Write the message to file
		await this._writeLogMessageToFile(fullLogMessage)

		// Return
		return
	}

	/**
	 * Logs an error message to stdout and the log file
	 * @param { Array<string> | string } logMessages - The log message(s)
	 * @returns { Promise<void> } void
	 */
	public async error(...logMessages: Array<string>): Promise<void> {
		// Get the log times
		const logTime: string = new Date().toLocaleTimeString(this._lossLoggingLocale)
		const logDate: string = new Date().toLocaleDateString(this._lossLoggingLocale)

		// Format the prefix of the log message
		const logMessagePrefix: string = await this._formatLogMessagePrefix(LogType.error, logTime, logDate)

		// Combine the log messages into a single message
		let logMessageSuffix: string = ""
		logMessages.forEach((logMessage: string) => { logMessageSuffix += (logMessage + " "); })

		// Combine the log prefix with the suffix
		const fullLogMessage: string = `${logMessagePrefix} ${logMessageSuffix}`

		// Log the message to console
		console.log(fullLogMessage)

		// Write the message to file
		await this._writeLogMessageToFile(fullLogMessage)

		// Return
		return
	}

	/**
	 * Logs a warning message to stdout and the log file
	 * @param { Array<string> | string } logMessages - The log message(s)
	 * @returns { Promise<void> } void
	 */
	public async warning(...logMessages: Array<string>): Promise<void> {
		// Get the log times
		const logTime: string = new Date().toLocaleTimeString(this._lossLoggingLocale)
		const logDate: string = new Date().toLocaleDateString(this._lossLoggingLocale)

		// Format the prefix of the log message
		const logMessagePrefix: string = await this._formatLogMessagePrefix(LogType.warning, logTime, logDate)

		// Combine the log messages into a single message
		let logMessageSuffix: string = ""
		logMessages.forEach((logMessage: string) => { logMessageSuffix += (logMessage + " "); })

		// Combine the log prefix with the suffix
		const fullLogMessage: string = `${logMessagePrefix} ${logMessageSuffix}`

		// Log the message to console
		console.log(fullLogMessage)

		// Write the message to file
		await this._writeLogMessageToFile(fullLogMessage)

		// Return
		return
	}

	/**
	 * Logs an info message to stdout and the log file
	 * @param { Array<string> | string } logMessages - The log message(s)
	 * @returns { Promise<void> } void
	 */
	public async info(...logMessages: Array<string>): Promise<void> {
		// Get the log times
		const logTime: string = new Date().toLocaleTimeString(this._lossLoggingLocale)
		const logDate: string = new Date().toLocaleDateString(this._lossLoggingLocale)

		// Format the prefix of the log message
		const logMessagePrefix: string = await this._formatLogMessagePrefix(LogType.info, logTime, logDate)

		// Combine the log messages into a single message
		let logMessageSuffix: string = ""
		logMessages.forEach((logMessage: string) => { logMessageSuffix += (logMessage + " "); })

		// Combine the log prefix with the suffix
		const fullLogMessage: string = `${logMessagePrefix} ${logMessageSuffix}`

		// Log the message to console
		console.log(fullLogMessage)

		// Write the message to file
		await this._writeLogMessageToFile(fullLogMessage)

		// Return
		return
	}

	/**
	 * Logs a debug message to stdout and the log file
	 * @requires lossEnableDebugMode to be true
	 * @param { Array<string> | string } logMessages - The log message(s)
	 * @returns { Promise<void> } void
	 */
	public async debug(...logMessages: Array<string>): Promise<void> {
		// Check for debug mode
		if (!this._lossEnableDebugMode) { return; }

		// Get the log times
		const logTime: string = new Date().toLocaleTimeString(this._lossLoggingLocale)
		const logDate: string = new Date().toLocaleDateString(this._lossLoggingLocale)

		// Format the prefix of the log message
		const logMessagePrefix: string = await this._formatLogMessagePrefix(LogType.debug, logTime, logDate)

		// Combine the log messages into a single message
		let logMessageSuffix: string = ""
		logMessages.forEach((logMessage: string) => { logMessageSuffix += (logMessage + " "); })

		// Combine the log prefix with the suffix
		const fullLogMessage: string = `${logMessagePrefix} ${logMessageSuffix}`

		// Log the message to console
		console.log(fullLogMessage)

		// Write the message to file
		await this._writeLogMessageToFile(fullLogMessage)

		// Return
		return
	}

	// Private Static Methods
	/**
	 * Create a new Loss logging directory
	 * @param { string } fullLossLoggingDirectoryPath - The full logging path
	 * @returns { Promise<void> } void
	 */
	private static async _createLossLoggingDirectory(fullLossLoggingDirectoryPath: string): Promise<void> {
		// Check if we have created an already existing logging directory
		await access(fullLossLoggingDirectoryPath, constants.F_OK)
			// We don't have a logging directory, create one
			.catch((_: Error) => {
				mkdir(fullLossLoggingDirectoryPath)
					// Error while creating a new directory
					.catch((error: Error) => {
						console.error(`[ERROR] Error while creating logging directory | ${error}`)
						return
					})
					// Directory successfully created
					.then(() => { return; })
			})
			// We have a logging directory, early return
			.then(() => { return; })
	}

	// Private Inherited Methods
	/**
	 * Writes a log message to the log file
	 * @param { string } logMessage - The message to write 
	 * @returns { Promise<void> } void
	 */
	private async _writeLogMessageToFile(logMessage: string): Promise<void> {
		const logFilePath: string = join(this._lossLoggingDirectory, this._lossLoggingFileName)
		await writeFile(logFilePath, (logMessage + "\n"), { flag: 'a+', }).catch((error: Error) => { console.error(`Error while writing log to file | ${error}`); return; })
		return
	}

	/**
	 * Returns a formatted string prefix based on the inputs
	 * @param { LogType } logType - The type of log message  
	 * @param { string } logTime - The time of the log 
	 * @param { string } logDate - The date of the log 
	 * @returns { Promise<string> } string
	 */
	private async _formatLogMessagePrefix(logType: LogType, logTime: string, logDate: string): Promise<string> {
		return this._logMessageFormat.replace("%LOG_TYPE%", logType.valueOf()).replace("%LOG_TIME%", logTime).replace("%LOG_DATE%", logDate)
	}
}

// Constants

// Public Variables

// Private Variables

// _init()

// Public Methods

// Private Methods

// Run