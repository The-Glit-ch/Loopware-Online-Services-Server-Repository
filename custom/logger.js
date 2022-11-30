// A simple logging file
// Just to keep stuff tidy
exports.formated_log = function formated_log(message){
	console.log(`[LOG] ${message}`)
}

exports.formated_error = function formated_error(message){
	console.error(`[ERR] ${message}`)
}

exports.formated_warn = function formated_warn(message){
	console.warn(`[WRN] ${message}`)
}