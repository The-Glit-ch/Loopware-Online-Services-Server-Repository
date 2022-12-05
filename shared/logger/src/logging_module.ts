// Logging module for every subsystem/service
// Required by every service

// Filesystem
import { writeFile, mkdirSync, existsSync } from 'fs'
import { join } from 'path'

// Config
const logging_directory: string = './logs'
// Hell
const logging_file_name: string = new Date().toLocaleString('en-US').replace("/", "-").replace("/", "-").replace(", ", "_").replace(":",".").replace(":", ".") + ".txt"

// Private Methods
function main(): void {if (!check_for_logging_directory()) { create_logging_directory() }}

function check_for_logging_directory(): boolean {return existsSync(join(process.cwd(), logging_directory))}

function create_logging_directory(): void {mkdirSync(join(process.cwd(), logging_directory))}

function write_to_log_file(message: string): void {
	writeFile(join(process.cwd(), logging_directory, logging_file_name), message + "\n", {encoding: 'utf-8', flag: 'a+'}, (err) => {
		if (err) return console.log("[ERR] ERROR SAVING LOG FILE!")
	})
}

// Init
main()

export function log(message: string):void {
	let log_time: string = new Date().toLocaleTimeString('en-US')
	let formated_message: string = `[LOG @ ${log_time}] ${message}`

	console.log(formated_message)
	write_to_log_file(formated_message)
}

export function err(message: string):void {
	let log_time: string = new Date().toLocaleTimeString('en-US')
	let formated_message: string = `[ERR @ ${log_time}] ${message}`

	console.log(formated_message)
	write_to_log_file(formated_message)
}

export function wrn(message: string):void {
	let log_time: string = new Date().toLocaleTimeString('en-US')
	let formated_message: string = `[WRN @ ${log_time}] ${message}`

	console.log(formated_message)
	write_to_log_file(formated_message)
}

