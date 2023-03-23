// Imports
import http from 'http'
import https from 'https'
import { err } from '../../logging-module/src/logging_module'
import { request, RequestOptions } from '../../requests-module/src/requests_module'

// Docstring
/**
 * Loopware Online Subsystem @ Analytics Module || "Frontend" module that allows for analytical data to be saved for any current and future system
 */

// Enums

// Interface

// Constants
const ANALYTICS_URL: string = "https://127.0.0.1:36212/analytics/api/v1/write-data"

// ENV Constants

// Public Variables
export function logAnalyticalData(data: object, service: string): void {
	// Create a payload
	// Refer to `validateAccessToken` under the authorization_module.ts file
	let bypassAgent: https.Agent = new https.Agent({ rejectUnauthorized: false, requestCert: false })
	let requestURL: string = ANALYTICS_URL
	let requestMethod: string = 'POST'
	let requestData: object = { analyticalService: service, analyticalData: data }
	let requestHeaders: http.OutgoingHttpHeaders = { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(Buffer.from(JSON.stringify(requestData))) }

	let payload: RequestOptions = {
		requestURL: requestURL,
		requestMethod: requestMethod,
		requestData: requestData,
		requestHeaders: requestHeaders,
		requestAgent: bypassAgent
	}

	request(payload)
		.catch((error) => { err(`Error while sending analytical data | ${error}`); return; })
}

// Private Variables

// _init()

// Public Methods

// Private Methods

// Run