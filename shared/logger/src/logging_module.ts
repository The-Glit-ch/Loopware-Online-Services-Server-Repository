// Imports
import { writeFile, mkdirSync, existsSync } from 'fs'
import { join } from 'path'

// Docstring
/*
*Loopware Online Subsystem @ Logging Module || A simple to use logging module that can be customized
*and changed to your hearts content
*/

// Enums

// Constants
const loggingLocale: string = 'en-US'
const loggingDirectory: string = './logs'
const loggingFileName: string = ''

// Public Variables

// Private Variables

// _init()
function _init(): void{
	// Check and/or create a logging directory
	_checkForLoggingDirectory()
}

// Public Methods
/**
 * Logs a message to stdout
 * @param { string | undefined} message - Message to log/write
 */
function log(message?: string | any): void{
	let logTime: string = new Date().toLocaleDateString(loggingLocale)
	let formattedMessage: string = `[LOG @ ${logTime}] ${message}`

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
 * @param { string } data - Data that should be written to the file. 
 * Must be a string
 * @returns void
 */
function _writeToLogFile(data: string): Promise<void>{
	let path: string = join(process.cwd(), loggingDirectory, loggingFileName)

	return new Promise((_, reject) => {
		writeFile(path, data, (err) => {
			if (err){ reject(err) }
		})
	})
}

// Exports
_checkForLoggingDirectory()





// Logging module for every subsystem/service
// Required by every service


// Config
const logging_directory: string = './logs'
// Hell
const logging_file_name: string = new Date().toLocaleString('en-US').replace("/", "-").replace("/", "-").replace(", ", "_").replace(":",".").replace(":", ".") + ".log"


// export function log(message: string):void {
// 	let log_time: string = new Date().toLocaleTimeString('en-US')
// 	let formated_message: string = `[LOG @ ${log_time}] ${message}`

// 	console.log(formated_message)
// 	write_to_log_file(formated_message)
// }

// export function err(message: string):void {
// 	let log_time: string = new Date().toLocaleTimeString('en-US')
// 	let formated_message: string = `[ERR @ ${log_time}] ${message}`

// 	console.log(formated_message)
// 	write_to_log_file(formated_message)
// }

// export function wrn(message: string):void {
// 	let log_time: string = new Date().toLocaleTimeString('en-US')
// 	let formated_message: string = `[WRN @ ${log_time}] ${message}`

// 	console.log(formated_message)
// 	write_to_log_file(formated_message)
// }

