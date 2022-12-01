// Crypto
const { randomBytes, createHash } = require('crypto')

// Filesystem
const { writeFile, readFile, readdir } = require('fs')
const { join } = require('path')

// Crypto
const crypto = require('crypto')

// Keys
var client_token
var server_token

// Config
const random_byte_length_limit = 32 // 32 characters of random bytes
const data_directory = join(process.cwd(), "/data")


exports.generate_new_api_key = function generate_new_api_keys(){
	// Client token is the unhashed API key. The client will use that to access the server
	// Private token is the hashed API key. The server will use this to compare the client token
	let client_token
	let private_token

	client_token = randomBytes(random_byte_length_limit).toString('base64')
	private_token = "Bearer " + createHash('sha256').update(client_token).digest('base64')

	client_token = client_token
	server_token = private_token

	return [client_token, server_token]
}

exports.check_for_saved_api_keys = function check_for_saved_api_keys(){
	return new Promise((resolve, reject) => {
		readdir(data_directory, (err, file) => {
			if (err) return reject(err)

			return (file == "save.keys") ? resolve(true) : resolve(false)
		})
	})
}

exports.write_api_key_to_file = function write_api_key_to_file(api_key){
	return new Promise((resolve, reject) => {
		writeFile(join(data_directory, "/save.keys"), api_key, (err) => {
			if (err) return reject(err)
		})
	})
}

exports.read_api_key_from_file = function read_api_key_from_file(){
	return new Promise((resolve, reject) => {
		readFile(join(data_directory, "/save.keys"), (err, key) => {
			if (err) return reject(err)

			return resolve(key)
		})
	})
}

exports.hash_incoming_key = function hash_incoming_key(api_key){
	return `Bearer ${crypto.createHash("sha256").update(api_key).digest('base64')}`
}