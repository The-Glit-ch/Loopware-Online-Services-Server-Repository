// Imports
import axios, { AxiosResponse } from 'axios';
import { join } from 'path';
import { config } from 'dotenv';
import { describe, test, expect } from 'vitest';

// Docstring
/**
 * Loopware Online Subsystem @ Authorization Server - Server-Endpoint Tests || Contains tests for testing endpoints
 * 🤯🤯🤯🤯🤯🤯🤯🤯🤯🤯🤯🤯🤯🤯🤯🤯🤯🤯🤯🤯🤯🤯🤯🤯🤯🤯🤯🤯🤯🤯🤯🤯🤯🤯🤯🤯🤯🤯🤯🤯🤯🤯🤯🤯🤯
 */

// Enums

// Structures
interface configObject {
	url: string
	method: string
	data?: {}
	headers?: {}
}

// Constants
const _environmentLoadingError: Error | undefined = config({path: join(process.cwd(), '../.env/.auth-config.env')}).error
const PORT: string | undefined = process.env.PORT
const BASE_URL: string = `http://127.0.0.1:${PORT}/auth/server`
const CLIENT_TOKEN: string | undefined = process.env.CLIENT_TOKEN

// Public Variables

// Private Variables

// _init()
if (_environmentLoadingError){console.log(_environmentLoadingError)}

// Private Methods
function _sendHTTPRequest(config: configObject): Promise<AxiosResponse> {
	return axios({url: config.url, method: config.method, data: config.data, headers: config.headers})
}

/**
 * Helper function
 * @param { boolean } alterClientToken - If set to true the client token is set to an invalid token
 * @returns { void }
 */
async function _acquireToken(alterClientToken?: boolean): Promise<any> {
	let devConfig: configObject = {url: `${BASE_URL}/register`, method: 'POST', headers: {'Authorization': `Bearer ${CLIENT_TOKEN}`}}
	let altConfig: configObject = {url: `${BASE_URL}/register`, method: 'POST', headers: {'Authorization': `Bearer invalid`}}
	
	if (!alterClientToken){
		let axiosResponse: AxiosResponse = await _sendHTTPRequest(devConfig)
		return axiosResponse.data
	}

	let axiosResponse: AxiosResponse = await _sendHTTPRequest(altConfig)
	return axiosResponse.data
}

// Tests
/**
 * Test cases for "/register" endpoint
 */
describe('Unit Tests - /register Endpoint', () => {
	test('Client Token is passed - Return 200 || OK', async () => {
		let testConfig: configObject = {url: `${BASE_URL}/register`, method: 'POST', headers: {'Authorization': `Bearer ${CLIENT_TOKEN}`}}
		let axiosResponse: AxiosResponse = await _sendHTTPRequest(testConfig)

		expect(axiosResponse.status).toBe(200)
	})

	test('Client Token not passed - Return 401 || UNAUTHORIZED', async () => {
		// Can only catch 2XX, use try/catch for anything else
		try{
			// This will always error out because of how axios handles HTTP calls
			let testConfig: configObject = {url: `${BASE_URL}/register`, method: 'POST', headers: {}}
			await _sendHTTPRequest(testConfig)
		}catch (error){
			expect(error.response.status).toBe(401)
		}
	})

	test('Client Token is invalid - Return 400 || Bad Request', async () => {
		// Can only catch 2XX, use try/catch for anything else
		try{
			// This will always error out because of how axios handles HTTP calls
			let testConfig: configObject = {url: `${BASE_URL}/register`, method: 'POST', headers: {'Authorization': `Bearer invalid`}}
			await _sendHTTPRequest(testConfig)
		}catch (error){
			expect(error.response.status).toBe(400)
		}	
	})

	test('Invalid HTTP Method - Return 404 || Unknown', async () => {
		// Can only catch 2XX, use try/catch for anything else
		try{
			// This will always error out because of how axios handles HTTP calls
			let testConfig: configObject = {url: `${BASE_URL}/register`, method: 'GET', headers: {}}
			await _sendHTTPRequest(testConfig)
		}catch (error){
			expect(error.response.status).toBe(404)
		}
	})
})

describe('Unit Tests - /refresh', () => {
	test('Client Token is valid && Refresh Token passed - Return 200 || OK', async () => {
		let tokens: any = await _acquireToken()
		let testConfig: configObject = {url: `${BASE_URL}/refresh`, method: 'POST', headers: {"Authorization": `Bearer ${tokens.message.refresh_token}`}}
		let axiosResponse: AxiosResponse = await _sendHTTPRequest(testConfig)

		expect(axiosResponse.status).toBe(200)
	})

	test('Invalid HTTP Method - Return 404 || Unknown', async () => {
		try{
			let tokens: any = await _acquireToken()
			let testConfig: configObject = {url: `${BASE_URL}/refresh`, method: 'GET', headers: {"Authorization": `Bearer ${tokens.message.refresh_token}`}}
			await _sendHTTPRequest(testConfig)
		}catch (error){
			expect(error.response.status).toBe(404)
		}
	})
})

describe('Unit Tests - /logout', () => {
	test('Client Token is valid && Refresh Token passed - Return 200 || OK', async () => {
		let tokens: any = await _acquireToken()
		let testConfig: configObject = {url: `${BASE_URL}/logout`, method: 'POST', headers: {"Authorization": `Bearer ${tokens.message.refresh_token}`}}
		let axiosResponse: AxiosResponse = await _sendHTTPRequest(testConfig)

		expect(axiosResponse.status).toBe(200)
	})

	test('Check if token is actually removed - Return 401 || OK', async () => {
		try{
			let tokens: any = await _acquireToken()
			let testConfig: configObject = {url: `${BASE_URL}/logout`, method: 'POST', headers: {"Authorization": `Bearer ${tokens.message.refresh_token}`}}
			await _sendHTTPRequest(testConfig)
			await _sendHTTPRequest(testConfig)
		}catch (error){
			expect(error.response.status).toBe(404)
		}
	})
})

// Run