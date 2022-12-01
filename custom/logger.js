// A simple logging file
// Just to keep stuff tidy

// Date
const { getUnixTime } = require('date-fns')

// Filesystem
const { writeFile } = require('fs')
const { join } = require('path')

// Config
const log_dir = join(process.cwd(), "/data/logs")
const file_name = `${getUnixTime(Date.now())}.txt`

exports.formated_log = function formated_log(message){
	console.log(`[LOG] ${message}`)
	write_to_log_file(`[LOG] ${message}`)
}

exports.formated_error = function formated_error(message){
	console.error(`[ERR] ${message}`)
	write_to_log_file(`[ERR] ${message}`)
}

exports.formated_warn = function formated_warn(message){
	console.warn(`[WRN] ${message}`)
	write_to_log_file(`[WRN] ${message}`)
}

function write_to_log_file(data){
	new Promise((reject, resolve) => {
		writeFile(join(log_dir, file_name), data + "\n", {encoding: 'utf-8', flag: "a"}, (err) => {
			if (err) return reject(err)
		})
	})
}