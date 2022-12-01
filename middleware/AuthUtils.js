// Crypto
const { randomBytes, createHash } = require('crypto')

// Filesystem
const { writeFile, readdir } = require('fs')

// Keys
var server_token

class AuthUtils{
	constructor(random_byte_length_limit){
		this.random_byte_length_limit = random_byte_length_limit
	}


	


}


// AUTH Functions
async function main(){
	// Check if there is a token already saved
	// If not generate a new token
	let result = await check_for_saved_keys()
	let keys = []

	if (result == false){
		keys = generate_new_api_keys(32)
		logger.formated_log(`Your new API key is: ${keys[0]}`)
		await save_api_key_to_file(`Bearer ${keys[1]}`)

		test_key = `Bearer ${keys[1]}`
	}
}

exports.generate_new_api_keys = function generate_new_api_keys(random_byte_limit){
	let private_key
	let public_key

	public_key = randomBytes(random_byte_limit).toString("base64")
	private_key = createHash("sha256").update(public_key).digest('base64') // Stored on the server
	
	return [public_key, private_key]
}

function check_for_saved_keys(){
	return new Promise((resolve, reject) => {
		readdir(data_directory, (err, file) => {
			if (err) return reject(err)

			if (file == "save.keys"){
				resolve(true)
			}else{
				resolve(false)
			}
		})
	})
}

function save_api_key_to_file(api_key){
	return new Promise((resolve, reject) => {
		writeFile(path.join(data_directory, "save.keys"), api_key, (err) => {
			if (err) return reject(err)

			resolve(logger.formated_log("Server API key saved"))
		})
	})
}