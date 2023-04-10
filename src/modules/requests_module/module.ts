// Imports
import http from 'http'
import https from 'https'
import { serializeData } from '../../modules/utility_module/module'

// Docstring
/**
 * Loopware Online Subsystem @ Requests Module
 * Custom in house module for sending HTTP/S requests
 * I'm genuinely surprised that NodeJS doesn't have a simple module for doing this
 */

// Classes

// Enums

// Interface
export interface RequestOptions {
	agent?: { http?: http.Agent, https?: https.Agent, },
	payload?: object,
	headers?: http.OutgoingHttpHeaders,
	method?: string | "GET",
}

// Constants

// ENV Constants

// Public Variables

// Private Variables

// _init()

// Public Methods
/**
 * Make a HTTP/S request to a remote server
 * @param { string } url - The server's URL
 * @param { RequestOptions } options - Additional options for the request 
 * @returns { Promise<Error | object> } Promise
 */
export function request(url: string, options?: RequestOptions): Promise<Error | object> {
	return new Promise((resolve, reject) => {
		// Parse the URL and see if we are doing HTTP or HTTPS
		let parsedURL: URL = new URL(url)
		let requestedURLProtocol: string = parsedURL.protocol
		let requestedURLHostname: string = parsedURL.hostname
		let requestedURLPort: string = parsedURL.port
		let requestedURLPathname: string = parsedURL.pathname

		if (requestedURLProtocol === "http:") {
			// Create a request payload
			let payload: http.RequestOptions = {
				agent: options?.agent?.http,
				hostname: requestedURLHostname,
				path: requestedURLPathname,
				port: requestedURLPort,
				headers: options?.headers,
				method: options?.method,
			}

			// Send the request and start the stream
			let request: http.ClientRequest = http.request(url, payload, (res: http.IncomingMessage) => {
				// Make new buffer array
				let bufferArray: Array<Buffer> = []

				// Handle errors
				res.on('error', (error: Error) => { reject({ error: error }); })

				// Add buffer to buffer array
				res.on('data', (chunk: any) => { bufferArray.push(chunk); })

				// Data stream finished, return data
				res.on('end', () => { resolve((bufferArray.length != 0) ? (_bufferArrayToObject(bufferArray)) : ({})); })
			})

			// Send data if available
			if (options?.payload) { request.write(serializeData(options.payload), (error: Error | null | undefined) => { if (error) { reject(error); } }) }
			request.end()
		}

		if (requestedURLProtocol === "https:") {
			// Create a request payload
			let payload: http.RequestOptions = {
				agent: options?.agent?.http,
				hostname: requestedURLHostname,
				path: requestedURLPathname,
				port: requestedURLPort,
				headers: options?.headers,
				method: options?.method,
			}

			// Send the request and start the stream
			let request: http.ClientRequest = https.request(url, payload, (res: http.IncomingMessage) => {
				// Make new buffer array
				let bufferArray: Array<Buffer> = []

				// Handle errors
				res.on('error', (error: Error) => { reject({ error: error }); })

				// Add buffer to buffer array
				res.on('data', (chunk: any) => { bufferArray.push(chunk); })

				// Data stream finished, return data
				res.on('end', () => { resolve((bufferArray.length != 0) ? (_bufferArrayToObject(bufferArray)) : ({})); })
			})

			// Send data if available
			if (options?.payload) { request.write(serializeData(options.payload), (error: Error | null | undefined) => { if (error) { reject(error); } }) }
			request.end()
		}
	})
}

// Private Methods
/**
 * Parses a buffer array to a JS/TS object
 * @param { Array<Buffer> } dataBuffer - The data array buffer
 * @returns { object } A valid JS/TS object
 */
function _bufferArrayToObject(dataBuffer: Array<Buffer>): object {
	return JSON.parse(Buffer.concat(dataBuffer).toString('utf-8'))
}

// Callbacks

// Run