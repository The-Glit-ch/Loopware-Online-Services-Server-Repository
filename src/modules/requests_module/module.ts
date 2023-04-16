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
export enum RequestMethod {
	GET = "GET",
	HEAD = "HEAD",
	POST = "POST",
	PUT = "PUT",
	DELETE = "DELETE",
	CONNECT = "CONNECT",
	OPTIONS = "OPTIONS",
	TRACE = "TRACE",
	PATCH = "PATCH",
}

// Interface
interface RequestPayload {
	agent: http.Agent | https.Agent | boolean,
	method: string,
	protocol: string,
	hostname: string,
	port: string,
	path: string,
	headers: http.OutgoingHttpHeaders,
}

export interface RequestOptions {
	headers?: http.OutgoingHttpHeaders,
	agent?: http.Agent | https.Agent | boolean,
	body?: any,
}

// Constants

// ENV Constants

// Public Variables

// Private Variables

// _init()

// Public Methods
/**
 * Make a HTTP/S request to a remote server
 * @param { string | URL } url - The server's URL
 * @param { RequestMethod } method - The request method
 * @param { RequestOptions } requestOptions - Extra options for the request
 * @returns { Promise<any | Error > } - Returns a promise
 */
export function request(url: string | URL, method: RequestMethod, requestOptions?: RequestOptions): Promise<any | Error> {
	return new Promise((resolve, reject) => {
		// Parse the URL into a URL object if needed
		if (typeof (url) === "string") { url = new URL(url); }

		// Retrieve URL data
		let requestProtocol: string = url.protocol
		let requestHostname: string = url.hostname
		let requestPort: string = url.port
		let requestPath: string = url.pathname

		// Create a payload
		let requestPayload: RequestPayload = {
			agent: requestOptions?.agent || false,
			method: method,
			protocol: requestProtocol,
			hostname: requestHostname,
			port: requestPort,
			path: requestPath,
			headers: requestOptions?.headers || {}
		}

		// Send request
		if (requestProtocol === "http:") {
			let httpRequest: http.ClientRequest = http.request(url, requestPayload, (res: http.IncomingMessage) => {
				// Make a buffer array
				let bufferArray: Array<Buffer> = []

				// Handle errors
				res.on('error', (error: Error) => { reject({ error: error, }); })

				// Add incoming data to buffer
				res.on('data', (chunk: any) => { bufferArray.push(chunk); })

				// Handle closing of data stream
				res.on('end', () => { resolve((bufferArray.length === 0) ? ({}) : (_bufferArrayToObject(bufferArray))); })
			})

			// Send any body data
			if (requestOptions?.body) { httpRequest.write(serializeData(requestOptions.body), (error: Error | null | undefined) => { if (error) { reject({ error: error }); }; }); }
			httpRequest.end()
		}

		if (requestProtocol === "https:") {
			let httpRequest: http.ClientRequest = https.request(url, requestPayload, (res: http.IncomingMessage) => {
				// Make a buffer array
				let bufferArray: Array<Buffer> = []

				// Handle errors
				res.on('error', (error: Error) => { reject({ error: error, }); })

				// Add incoming data to buffer
				res.on('data', (chunk: any) => { bufferArray.push(chunk); })

				// Handle closing of data stream
				res.on('end', () => { resolve((bufferArray.length === 0) ? ({}) : (_bufferArrayToObject(bufferArray))); })
			})

			// Send any body data
			if (requestOptions?.body) { httpRequest.write(serializeData(requestOptions.body), (error: Error | null | undefined) => { if (error) { reject({ error: error }); }; }); }
			httpRequest.end()
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