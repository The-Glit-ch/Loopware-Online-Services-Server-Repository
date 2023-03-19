// Imports
import https from 'https'
import http from 'http'

// Docstring
/**
 * Loopware Online Subsystem @ Requests Module || Custom HTTPS fetch module used for interacting with internal Loss services
 */

// Enums

// Interface
export interface RequestOptions {
	requestMethod: string,
	requestURL: string,
	requestHeaders: http.OutgoingHttpHeaders,
	requestData?: object,
	requestAgent?: https.Agent
	
}

// Constants

// ENV Constants

// Public Variables

// Private Variables

// _init()

// Public Methods
/**
 * Creates a new HTTP(S) request to the specified server
 * @param { RequestOptions } requestOptions
 * @returns { Promise<any> } Returns a promise
 */
export function request(requestOptions: RequestOptions): Promise<any> {
	return new Promise((resolve, reject) => {
		// Parse data
		let requestedURL: URL = new URL(requestOptions.requestURL)
		let requestedURLProtocol: string = requestedURL.protocol
		let requestedURLHostname: string = requestedURL.hostname
		let requestedURLPort: string = requestedURL.port
		let requestedURLPath: string = requestedURL.pathname

		// Set options
		let fetchOptions: https.RequestOptions = {
			agent: requestOptions.requestAgent,
			protocol: requestedURLProtocol,
			hostname: requestedURLHostname,
			port: requestedURLPort,
			path: requestedURLPath,
			headers: requestOptions.requestHeaders,
			method: requestOptions.requestMethod,
		}

		// Make request
		let request: http.ClientRequest = https.request(fetchOptions, (res: http.IncomingMessage) => {
			// Store any incoming data
			let incomingDataBuffer: Array<Buffer> = []

			// Handle errors
			res.on('error', (error) => { reject({error: error}) })

			// Data received, add to buffer array
			res.on('data', (dataChunk) => { incomingDataBuffer.push(dataChunk) })

			// No more data to read, return
			res.on('end', () => {
				let returnData: object = (incomingDataBuffer.length != 0) ? (_bufferArrayToJSON(incomingDataBuffer)) : ({})
				resolve(returnData)
			})
		})

		// Are we sending data?
		if (requestOptions.requestData != undefined){ request.write(_stringifyData(requestOptions.requestData), (error) => { if (error){ reject(error) } }) }
		request.end();
	})
}

// Private Methods
/**
 * Parses a buffer array JSON object to a normal JS/TS object
 * @param { Array<Buffer> } dataBuffer - The data array buffer
 * @returns { object } A valid JS/TS object
 */
function _bufferArrayToJSON(dataBuffer: Array<Buffer>): object{
	return JSON.parse(Buffer.concat(dataBuffer).toString('utf-8'))
}

/**
 * Stringifies data with `JSON.stringify`
 * @param { any } data - The data to stringify 
 * @returns { string } StringifiedData
 */
function _stringifyData(data: any): string{
	return JSON.stringify(data)
}

// Run