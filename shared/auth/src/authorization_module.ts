// Authorization module that contains util functions for generating, verifying, and decoding tokens

// Crypto
import { createHash } from 'crypto'

// JWT
import { sign, verify, SignOptions } from 'jsonwebtoken'

// Verifies the client token to the internal server access token
// The client token is just the raw unhashed version of the server access token
// Returns "true" if the client token is valid
export function validate_client_token(client_token: string, server_token: string): boolean{
	let converted_token: string = createHash('sha256').update(client_token).digest('base64')
	return (converted_token == server_token)
}

// Generates a new JWT token
// Access token = Client Token + Server Access token + Expiration
// Refresh token = Client token + Server Refresh token 
export function generate_new_jwt(client_token: object, server_token: string, options?: object): string{ return sign(client_token, server_token, options) }

// Checks if the token provided is a valid JWT token
// Returns "true" and the decoded data
export function verify_and_decode_jwt(client_token: string, server_token: string): Array<any>{
	try{
		let data = verify(client_token, server_token)
		return [true, data]
	}catch(err){
		return [false, "decode_error"]
	}
}