// Imports
import { createSocket, RemoteInfo } from 'dgram'
import { join } from 'path'
import { config } from 'dotenv'
import { validateAccessToken } from '../../../../shared/authorization-module/src/authorization_module'
import { err, log, wrn } from '../../../../shared/logging-module/src/logging_module'
import { RedisClientType, createClient } from '@redis/client'
import { randomBytes } from 'crypto'
let _environmentLoadingError: Error | undefined = config({path: join(process.cwd(), './.env/.lossConfig.env')}).error

// Docstring
/**
 * Loopware Online Subsystem @ UDP Punchthrough Server || Provides a custom TURN server that allows for
 * creating sessions, joining sessions, and destroying sessions | Info on how this works here -> https://en.wikipedia.org/wiki/UDP_hole_punching
 * 
 * NOTE: The following code you are about to read may make you throw-up...You have been warned
 */

// Enums

// Interface
interface IncomingConnection {
	requestedRoute: string,
	incomingData: object | any,
	address: string,
	port: number,
	_remote: RemoteInfo,
}

interface RegisteredClient {
	remoteInfo: {
		address: string,
		port: number,
		_remote: RemoteInfo,
	},
	sessionData: {
		isHosting: boolean,
		currentSession: string,
	},
}

interface SessionObject {
	host: RegisteredClient,
	peers: Array<RegisteredClient>,
	code: string,
	sessionSettings: {
		maxConnections: number,
		name: string,
	},
}

interface SessionSearchResult {
	sessionCode: string,
	sessionName: string,
	currentPlayerCount: number,
	maxPlayerCount: number,
}

interface ResponseCodes {
	CONN_ACKNOWLEDGED: string,
	CONN_INVALID_BODY: string,
	CONN_ALREADY_REGISTERED: string,
	CONN_NOT_REGISTERED: string,
	CONN_ALREADY_HOSTING: string,
	CONN_ALREADY_IN_SESSION: string,
	CONN_SESSION_IS_FULL: string
	CONN_SESSION_NOT_FOUND: string,
	SESSION_PEER_CONNECTED: string,
	SESSION_PEER_DISCONNECTED: string,
	SESSION_DESTROYED: string,
	AUTH_INVALID_TOKENS: string,
	AUTH_ACCESS_TOKEN_NOT_PROVIDED: string,
	AUTH_CLIENT_TOKEN_NOT_PROVIDED: string,
	SERVER_INTERNAL_ERROR: string,
}

interface ResponseData {
	responseType: string,
	responseCode: string
	responseData: object
}

// Constants
const server = createSocket('udp6')
const redisCache: RedisClientType = createClient({socket: { host: '192.168.1.144', port: 36202 }})

// ENV Constants
const CURRENT_CONNECTED_CLIENTS: string = 'currentConnectedClients'
const CURRENT_HOSTED_SESSIONS: string = 'currentHostedSessions'
const PORT: number = Number(process.env.UDPPT_LISTEN_PORT)

// Public Variables

// Private Variables
var _pastConnectedClients: object = {}
var _pastHostedSessions: object = {}
var _responseCodes: ResponseCodes = {
	CONN_ACKNOWLEDGED: "CONN_ACKNOWLEDGED",
	CONN_INVALID_BODY: "CONN_INVALID_BODY",
	CONN_ALREADY_REGISTERED: "CONN_ALREADY_REGISTERED",
	CONN_NOT_REGISTERED: "CONN_NOT_REGISTERED",
	CONN_ALREADY_HOSTING: "CONN_ALREADY_HOSTING",
	CONN_ALREADY_IN_SESSION: "CONN_ALREADY_IN_SESSION",
	CONN_SESSION_IS_FULL: "CONN_SESSION_IS_FULL",
	CONN_SESSION_NOT_FOUND: "CONN_SESSION_NOT_FOUND",
	SESSION_PEER_CONNECTED: "SESSION_PEER_CONNECTED",
	SESSION_PEER_DISCONNECTED: "SESSION_PEER_DISCONNECTED",
	SESSION_DESTROYED: "SESSION_DESTROYED",
	AUTH_INVALID_TOKENS: "AUTH_INVALID_TOKENS",
	AUTH_ACCESS_TOKEN_NOT_PROVIDED: "AUTH_ACCESS_TOKEN_NOT_PROVIDED",
	AUTH_CLIENT_TOKEN_NOT_PROVIDED: "AUTH_CLIENT_TOKEN_NOT_PROVIDED",
	SERVER_INTERNAL_ERROR: "SERVER_INTERNAL_ERROR",
}

// _init()
async function _init(): Promise<void>{
	// Sanity Checks
	if (_environmentLoadingError != undefined){ wrn(`.ENV file was not successfully loaded | ${_environmentLoadingError.message}`) }

	// Connect to redis cache
	await redisCache.connect()

	// Initialize cache variables
	await _writeCacheData(CURRENT_CONNECTED_CLIENTS, JSON.stringify({}))
	await _writeCacheData(CURRENT_HOSTED_SESSIONS, JSON.stringify({}))

	// Start the heartbeat
	setInterval(() => {_serverHeartbeat()}, 5000)
}

// Public Methods
server.on('message', (message: Buffer, remoteInfo: RemoteInfo) => {
	// Decode the incoming buffer to a JSON object
	let decodedBuffer: object | any = JSON.parse(message.toString('utf-8'))
	let incomingClientConnection: IncomingConnection = {requestedRoute: decodedBuffer.requestedRoute, incomingData: decodedBuffer, address: remoteInfo.address, port: remoteInfo.port, _remote: remoteInfo}

	log(`New UDP connection from \"${incomingClientConnection.address}:${incomingClientConnection.port}\" requesting to \"${incomingClientConnection.requestedRoute}\"`)

	// Authorization middleware
	_authorizedConnection(incomingClientConnection)
		.catch((error) => {
			if (error){ err(`Error while sending response data | ${error}`) }
		})
		.then((validatedUserData: object | any) => {
			if (validatedUserData.isAuthorized){
				switch (incomingClientConnection.requestedRoute){
					case "registerClient":
						_registerClientHandler(incomingClientConnection)
						break
					
					case "createSession":
						_createSessionHandler(incomingClientConnection, validatedUserData.clientToken)
						break
					
					case "findSessions":
						_findSessionsHandler(incomingClientConnection, validatedUserData.clientToken)
						break
					
					case "joinSession":
						_joinSessionHandler(incomingClientConnection, validatedUserData.clientToken)
						break
					
					case "sendPacket":
						_sendPacketHandler(incomingClientConnection, validatedUserData.clientToken)
						break

					case "destroySession":
						_destroySessionHandler(incomingClientConnection, validatedUserData.clientToken)
						break
				}
			}
		})
})

// Private Methods
/**
 * Writes data to the Redis cache
 * @param { string } key - The key value 
 * @param { string} data - The data value 
 * @returns { Promise<any> } Promise
 */
function _writeCacheData(key: string, data: string): Promise<any>{
	return new Promise((resolve, reject) => {
		redisCache.set(key, data)
			.catch((error) => {
				reject(error)
			})
			.then((returnData) => {
				resolve(returnData)
			})
	})
}

/**
 * Fetches data from the Redis cache
 * @param { string } key - The key value 
 * @returns { Promise<any> } Promise
 */
function _fetchCachedData(key: string): Promise<any>{
	return new Promise((resolve, reject) => {
		redisCache.get(key)
			.catch((error) => {
				reject(error)
			})
			.then((returnData) => {
				resolve(returnData)
			})
	})
}

function _stringify(data: any): string{
	return JSON.stringify(data)
}

function _parse(data: any): object{
	return JSON.parse(data)
}

function _generateSessionCode(): string{
	return randomBytes(12).toString('hex')
}

function _serverHeartbeat(): void{
	console.log("TBI")
}

// Middleware
function _authorizedConnection(incomingConnectionData: IncomingConnection): Promise<object> {
	return new Promise((resolve, reject) => {
		// Retrieve tokens from authorization "header"
		let combinedTokens: Array<string> = incomingConnectionData.incomingData.authorizationBearer.split(":")
		let accessToken: string = combinedTokens[0]
		let clientToken: string = combinedTokens[1]

		// Check if tokens were provided
		// Access token
		if (accessToken == undefined){
			let responseData: ResponseData = {responseType: "SERVER", responseCode: _responseCodes.AUTH_ACCESS_TOKEN_NOT_PROVIDED, responseData: {message: "Access token not provided"}}
			server.send(_stringify(responseData), incomingConnectionData.port, incomingConnectionData.address, (error) => { reject(error) })
			resolve({isAuthorized: false, clientToken: {}})
		}

		// Client token
		if (clientToken == undefined){
			let responseData: ResponseData = {responseType: "SERVER", responseCode: _responseCodes.AUTH_CLIENT_TOKEN_NOT_PROVIDED, responseData: {message: "Client token not provided"}}
			server.send(_stringify(responseData), incomingConnectionData.port, incomingConnectionData.address, (error) => { reject(error) })
			resolve({isAuthorized: false, clientToken: {}})
		}
		
		// Validate tokens
		validateAccessToken(accessToken, clientToken)
			.catch((_error) => {
				let responseData: ResponseData = {responseType: "SERVER", responseCode: _responseCodes.AUTH_INVALID_TOKENS, responseData: {message: "Invalid access or client token"}}
				server.send(_stringify(responseData), incomingConnectionData.port, incomingConnectionData.address, (error) => { reject(error) })
				resolve({isAuthorized: false, clientToken: {}})
			})
			.then((validatedUserData: any) => {
				if (!validatedUserData){ reject() }
				resolve({isAuthorized: validatedUserData.isValid, clientToken: clientToken})
			})
	})
}

// "Routes"
function _registerClientHandler(incomingConnectionData: IncomingConnection): void{
	// Fetch current connected clients object
	_fetchCachedData(CURRENT_CONNECTED_CLIENTS)
		.catch((error) => {
			err(`Error while fetching data from \"${CURRENT_CONNECTED_CLIENTS}\" | ${error}`)
			let responseData: ResponseData = {responseType: "SERVER", responseCode: _responseCodes.SERVER_INTERNAL_ERROR, responseData: {message: "Server error"}}
			server.send(_stringify(responseData), incomingConnectionData.port, incomingConnectionData.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`); return; } })
			return
		})
		.then((fetchedCurrentConnectedClients: any) => {
			// Log
			log(`Successfully fetched data from \"${CURRENT_CONNECTED_CLIENTS}\"`)

			// Convert the data from string to object
			let currentConnectedClients: object | any = _parse(fetchedCurrentConnectedClients)

			// Check if the client has already been registered
			if (Object.hasOwn(currentConnectedClients, `${incomingConnectionData.address}:${incomingConnectionData.port}`)){
				let responseData: ResponseData = {responseType: "SERVER", responseCode: _responseCodes.CONN_ALREADY_REGISTERED, responseData: {message: "You are already registered"}}
				server.send(_stringify(responseData), incomingConnectionData.port, incomingConnectionData.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`); return; } })
				return
			}

			// Create a new client
			let newClientObject: RegisteredClient = {
				remoteInfo: {
					address: incomingConnectionData.address,
					port: incomingConnectionData.port,
					_remote: incomingConnectionData._remote,
				},
				sessionData: {
					isHosting: false,
					currentSession: ""
				},
			}

			// Add client to current connected clients object
			let clientIndex: string = `${newClientObject.remoteInfo.address}:${newClientObject.remoteInfo.port}`
			currentConnectedClients[clientIndex] = newClientObject

			// Write data
			_writeCacheData(CURRENT_CONNECTED_CLIENTS, _stringify(currentConnectedClients))
				.catch((error) => {
					err(`Error while writing data to \"${CURRENT_CONNECTED_CLIENTS}\" | ${error}`)
					let responseData: ResponseData = {responseType: "SERVER", responseCode: _responseCodes.SERVER_INTERNAL_ERROR, responseData: {message: "Server error"}}
					server.send(_stringify(responseData), incomingConnectionData.port, incomingConnectionData.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`); return; } })
					return
				})
				.then(() => {
					log(`Successfully wrote to \"${CURRENT_CONNECTED_CLIENTS}\"`)
					log(`Client \"${clientIndex}\" is now registered`)

					let responseData: ResponseData = {responseType: "SERVER", responseCode: _responseCodes.CONN_ACKNOWLEDGED, responseData: {message: "Success"}}
					server.send(_stringify(responseData), incomingConnectionData.port, incomingConnectionData.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`); return; } })
					return
				})
		})
}

function _createSessionHandler(incomingConnectionData: IncomingConnection, clientToken: string): void{
	// Retrieve the payload
	let payload: object | any = incomingConnectionData.incomingData
	let sessionMaxConnections: number = payload.sessionInfo.maxConnections
	let sessionName: string = payload.sessionInfo.sessionName

	// Check if data was provided
	if (sessionMaxConnections == undefined){ sessionMaxConnections = 10 }
	if (sessionName == undefined){ sessionName = ""}

	// Fetch current connected clients object
	_fetchCachedData(CURRENT_CONNECTED_CLIENTS)
		.catch((error) => {
			err(`Error while fetching data from \"${CURRENT_CONNECTED_CLIENTS}\" | ${error}`)
			let responseData: ResponseData = {responseType: "SERVER", responseCode: _responseCodes.SERVER_INTERNAL_ERROR, responseData: {message: "Server error"}}
			server.send(_stringify(responseData), incomingConnectionData.port, incomingConnectionData.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`); return; } })
			return
		})
		.then((fetchedCurrentConnectedClients: any) => {
			// Log
			log(`Successfully fetched data from \"${CURRENT_CONNECTED_CLIENTS}\"`)

			// Convert the data from string to object
			let currentConnectedClients: object | any = _parse(fetchedCurrentConnectedClients)

			// Check if the client is registered
			if (!Object.hasOwn(currentConnectedClients, `${incomingConnectionData.address}:${incomingConnectionData.port}`)){
				let responseData: ResponseData = {responseType: "SERVER", responseCode: _responseCodes.CONN_NOT_REGISTERED, responseData: {message: "You are not registered to use this service"}}
				server.send(_stringify(responseData), incomingConnectionData.port, incomingConnectionData.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`); return; } })
				return
			}

			// Check if the remote is hosting or in a session
			let clientIndex: string = `${incomingConnectionData.address}:${incomingConnectionData.port}`
			let isHostingCheck: boolean = currentConnectedClients[clientIndex].sessionData.isHosting
			let inSessionCheck: boolean = (currentConnectedClients[clientIndex].sessionData.currentSession == "") ? (false) : (true)

			if (isHostingCheck){
				let responseData: ResponseData = {responseType: "SERVER", responseCode: _responseCodes.CONN_ALREADY_HOSTING, responseData: {message: "You are already hosting a session"}}
				server.send(_stringify(responseData), incomingConnectionData.port, incomingConnectionData.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`); return; } })
				return
			}

			if (inSessionCheck){
				let responseData: ResponseData = {responseType: "SERVER", responseCode: _responseCodes.CONN_ALREADY_IN_SESSION, responseData: {message: "You are currently in a session"}}
				server.send(_stringify(responseData), incomingConnectionData.port, incomingConnectionData.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`); return; } })
				return
			}

			// Fetch current hosted sessions object
			_fetchCachedData(CURRENT_HOSTED_SESSIONS)
				.catch((error) => {
					err(`Error while fetching data from \"${CURRENT_HOSTED_SESSIONS}\" | ${error}`)
					let responseData: ResponseData = {responseType: "SERVER", responseCode: _responseCodes.SERVER_INTERNAL_ERROR, responseData: {message: "Server error"}}
					server.send(_stringify(responseData), incomingConnectionData.port, incomingConnectionData.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`); return; } })
					return
				})
				.then((fetchedCurrentHostedSessions: any) => {
					// Log
					log(`Successfully fetched data from \"${CURRENT_HOSTED_SESSIONS}\"`)

					// Convert the data from string to object
					let currentHostedSessions: object | any = _parse(fetchedCurrentHostedSessions)

					// Generate a new session code
					let newSessionCode: string = _generateSessionCode()

					// Get session details
					let newSessionHost: RegisteredClient = currentConnectedClients[clientIndex]
					if(sessionName == ""){ sessionName = `session-${String(Object.keys(currentHostedSessions).length)}` }

					// Create a new session object
					let newSessionObject: SessionObject = {
						host: newSessionHost,
						peers: [],
						code: newSessionCode,
						sessionSettings: {
							maxConnections: sessionMaxConnections,
							name: sessionName,
						},
					}

					// Update the client
					currentConnectedClients[clientIndex].sessionData.isHosting = true
					currentConnectedClients[clientIndex].sessionData.currentSession = newSessionCode

					// Update the sessions
					let sessionIndex: string = `${clientToken}:${newSessionCode}`
					currentHostedSessions[sessionIndex] = newSessionObject

					// Write data
					// NOTE: If one write fails we then have an "invisible" session
					_writeCacheData(CURRENT_CONNECTED_CLIENTS, _stringify(currentConnectedClients))
						.catch((error) => {
							err(`Error while writing data to \"${CURRENT_CONNECTED_CLIENTS}\" | ${error}`)
							let responseData: ResponseData = {responseType: "SERVER", responseCode: _responseCodes.SERVER_INTERNAL_ERROR, responseData: {message: "Server error"}}
							server.send(_stringify(responseData), incomingConnectionData.port, incomingConnectionData.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`); return; } })
							return
						})
						.then(() => {
							log(`Successfully wrote to \"${CURRENT_CONNECTED_CLIENTS}\"`)

							_writeCacheData(CURRENT_HOSTED_SESSIONS, _stringify(currentHostedSessions))
								.catch((error) => {
									err(`Error while writing data to \"${CURRENT_HOSTED_SESSIONS}\" | ${error}`)
									let responseData: ResponseData = {responseType: "SERVER", responseCode: _responseCodes.SERVER_INTERNAL_ERROR, responseData: {message: "Server error"}}
									server.send(_stringify(responseData), incomingConnectionData.port, incomingConnectionData.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`); return; } })
									return
								})
								.then(() => {
									log(`Successfully wrote to \"${CURRENT_HOSTED_SESSIONS}\"`)
									log(`New session created | Host: ${newSessionObject.host.remoteInfo.address}:${newSessionObject.host.remoteInfo.port}, Code: ${newSessionObject.code}, Name: ${newSessionObject.sessionSettings.name}`)

									let responseData: ResponseData = {responseType: "SERVER", responseCode: _responseCodes.CONN_ACKNOWLEDGED, responseData: {message: "Success", sessionCode: newSessionCode}}
									server.send(_stringify(responseData), incomingConnectionData.port, incomingConnectionData.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`); return; } })
									return
								})
						})
				})
		})
}

function _findSessionsHandler(incomingConnectionData: IncomingConnection, clientToken: string): void{
	// Retrieve the payload
	let payload: object | any = incomingConnectionData.incomingData
	let maxReturnResults: number = payload.searchSettings.maxResults

	// Check if data was provided
	if (maxReturnResults == undefined){ maxReturnResults = 10 }

	// Fetch current connect clients object
	_fetchCachedData(CURRENT_CONNECTED_CLIENTS)
		.catch((error) => {
			err(`Error while fetching data from \"${CURRENT_CONNECTED_CLIENTS}\" | ${error}`)
			let responseData: ResponseData = {responseType: "SERVER", responseCode: _responseCodes.SERVER_INTERNAL_ERROR, responseData: {message: "Server error"}}
			server.send(_stringify(responseData), incomingConnectionData.port, incomingConnectionData.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`); return; } })
			return
		})
		.then((fetchedCurrentConnectedClients: any) => {
			// Log
			log(`Successfully fetched data from \"${CURRENT_CONNECTED_CLIENTS}\"`)

			// Convert the data from string to object
			let currentConnectedClients: object | any = _parse(fetchedCurrentConnectedClients)

			// Check if the client is registered
			if (!Object.hasOwn(currentConnectedClients, `${incomingConnectionData.address}:${incomingConnectionData.port}`)){
				let responseData: ResponseData = {responseType: "SERVER", responseCode: _responseCodes.CONN_NOT_REGISTERED, responseData: {message: "You are not registered to use this service"}}
				server.send(_stringify(responseData), incomingConnectionData.port, incomingConnectionData.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`); return; } })
				return
			}

			// Fetch current hosted sessions object
			_fetchCachedData(CURRENT_HOSTED_SESSIONS)
				.catch((error) => {
					err(`Error while fetching data from \"${CURRENT_HOSTED_SESSIONS}\" | ${error}`)
					let responseData: ResponseData = {responseType: "SERVER", responseCode: _responseCodes.SERVER_INTERNAL_ERROR, responseData: {message: "Server error"}}
					server.send(_stringify(responseData), incomingConnectionData.port, incomingConnectionData.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`); return; } })
					return
				})
				.then((fetchedCurrentHostedSessions: any) => {
					// Log
					log(`Successfully fetched data from \"${CURRENT_HOSTED_SESSIONS}\"`)

					// Convert the data from string to object
					let currentHostedSessions: object | any = _parse(fetchedCurrentHostedSessions)

					// Start iterating
					// NOTE: This is so un-optimized its not even funny
					let returnSessions: Array<SessionSearchResult> = []
					Object.keys(currentHostedSessions).forEach((sessionKey: string, index: number) => {
						if (Math.abs(index) - 1 == maxReturnResults){ return; }
						if (sessionKey.includes(clientToken)){
							let sessionCode: string = sessionKey.split(":")[1]
							let sessionName: string = currentHostedSessions[sessionKey].sessionSettings.name
							let currentPlayerCount: number = currentHostedSessions[sessionKey].peers.length
							let maxPlayerCount: number = currentHostedSessions[sessionKey].sessionSettings.maxConnections
							returnSessions.push({sessionCode: sessionCode, sessionName: sessionName, currentPlayerCount: currentPlayerCount, maxPlayerCount: maxPlayerCount})
						}
					})

					let responseData: ResponseData = {responseType: "SERVER", responseCode: _responseCodes.CONN_ACKNOWLEDGED, responseData: {message: "Success", foundSessions: returnSessions}}
					server.send(_stringify(responseData), incomingConnectionData.port, incomingConnectionData.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`); return; } })
					return
				})
		})
}

function _joinSessionHandler(incomingConnectionData: IncomingConnection, clientToken: string): void{
	// Retrieve the payload
	let payload: object | any = incomingConnectionData.incomingData
	let sessionCode: string = payload.sessionCode

	// Check if data was provided
	if (sessionCode == undefined){
		let responseData: ResponseData = {responseType: "SERVER", responseCode: _responseCodes.CONN_INVALID_BODY, responseData: {message: "Session code not provided"}}
		server.send(_stringify(responseData), incomingConnectionData.port, incomingConnectionData.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`); return; } })
		return
	}

	// Fetch current connected clients object
	_fetchCachedData(CURRENT_CONNECTED_CLIENTS)
		.catch((error) => {
			err(`Error while fetching data from \"${CURRENT_CONNECTED_CLIENTS}\" | ${error}`)
			let responseData: ResponseData = {responseType: "SERVER", responseCode: _responseCodes.SERVER_INTERNAL_ERROR, responseData: {message: "Server error"}}
			server.send(_stringify(responseData), incomingConnectionData.port, incomingConnectionData.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`); return; } })
			return
		})
		.then((fetchedCurrentConnectedClients: any) => {
			// Log
			log(`Successfully fetched data from \"${CURRENT_CONNECTED_CLIENTS}\"`)

			// Convert the data from string to object
			let currentConnectedClients: object | any = _parse(fetchedCurrentConnectedClients)

			// Check if the client is registered
			if (!Object.hasOwn(currentConnectedClients, `${incomingConnectionData.address}:${incomingConnectionData.port}`)){
				let responseData: ResponseData = {responseType: "SERVER", responseCode: _responseCodes.CONN_NOT_REGISTERED, responseData: {message: "You are not registered to use this service"}}
				server.send(_stringify(responseData), incomingConnectionData.port, incomingConnectionData.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`); return; } })
				return
			}	

			// Check if the remote is hosting or in a session
			let clientIndex: string = `${incomingConnectionData.address}:${incomingConnectionData.port}`
			let isHostingCheck: boolean = currentConnectedClients[clientIndex].sessionData.isHosting
			let inSessionCheck: boolean = (currentConnectedClients[clientIndex].sessionData.currentSession == "") ? (false) : (true)

			if (isHostingCheck){
				let responseData: ResponseData = {responseType: "SERVER", responseCode: _responseCodes.CONN_ALREADY_HOSTING, responseData: {message: "You are currently hosting a session"}}
				server.send(_stringify(responseData), incomingConnectionData.port, incomingConnectionData.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`); return; } })
				return
			}

			if (inSessionCheck){
				let responseData: ResponseData = {responseType: "SERVER", responseCode: _responseCodes.CONN_ALREADY_IN_SESSION, responseData: {message: "You are already in a session"}}
				server.send(_stringify(responseData), incomingConnectionData.port, incomingConnectionData.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`); return; } })
				return
			}

			// Fetch current hosted sessions object
			_fetchCachedData(CURRENT_HOSTED_SESSIONS)
				.catch((error) => {
					err(`Error while fetching data from \"${CURRENT_HOSTED_SESSIONS}\" | ${error}`)
					let responseData: ResponseData = {responseType: "SERVER", responseCode: _responseCodes.SERVER_INTERNAL_ERROR, responseData: {message: "Server error"}}
					server.send(_stringify(responseData), incomingConnectionData.port, incomingConnectionData.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`); return; } })
					return
				})
				.then((fetchedCurrentHostedSessions: any) => {
					// Log
					log(`Successfully fetched data from \"${CURRENT_HOSTED_SESSIONS}\"`)

					// Convert the data from string to object
					let currentHostedSessions: object | any = _parse(fetchedCurrentHostedSessions)

					// Check if the session exists
					let requestedSessionIndex: string = `${clientToken}:${sessionCode}`
					if (!Object.hasOwn(currentHostedSessions, requestedSessionIndex)){
						let responseData: ResponseData = {responseType: "SERVER", responseCode: _responseCodes.CONN_SESSION_NOT_FOUND, responseData: {message: "The requested session was not found"}}
						server.send(_stringify(responseData), incomingConnectionData.port, incomingConnectionData.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`); return; } })
						return
					}

					// Check if the session is full
					let isSessionFullCheck: boolean = (currentHostedSessions[requestedSessionIndex].sessionSettings.maxConnections - currentHostedSessions[requestedSessionIndex].peers.length) == 0
					if (isSessionFullCheck){
						let responseData: ResponseData = {responseType: "SERVER", responseCode: _responseCodes.CONN_SESSION_IS_FULL, responseData: {message: "The requested session is currently full"}}
						server.send(_stringify(responseData), incomingConnectionData.port, incomingConnectionData.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`); return; } })
						return
					}

					// Update the client
					currentConnectedClients[clientIndex].sessionData.currentSession = sessionCode

					// Update the session
					currentHostedSessions[requestedSessionIndex].peers.push(currentConnectedClients[clientIndex])

					// Write to cache
					_writeCacheData(CURRENT_CONNECTED_CLIENTS, _stringify(currentConnectedClients))
						.catch((error) => {
							err(`Error while writing data to \"${CURRENT_CONNECTED_CLIENTS}\" | ${error}`)
							let responseData: ResponseData = {responseType: "SERVER", responseCode: _responseCodes.SERVER_INTERNAL_ERROR, responseData: {message: "Server error"}}
							server.send(_stringify(responseData), incomingConnectionData.port, incomingConnectionData.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`); return; } })
							return
						})
						.then(() => {
							log(`Successfully wrote to \"${CURRENT_CONNECTED_CLIENTS}\"`)

							_writeCacheData(CURRENT_HOSTED_SESSIONS, _stringify(currentHostedSessions))
								.catch((error) => {
									err(`Error while writing data to \"${CURRENT_HOSTED_SESSIONS}\" | ${error}`)
									let responseData: ResponseData = {responseType: "SERVER", responseCode: _responseCodes.SERVER_INTERNAL_ERROR, responseData: {message: "Server error"}}
									server.send(_stringify(responseData), incomingConnectionData.port, incomingConnectionData.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`); return; } })
									return
								})
								.then(() => {
									log(`Successfully wrote to \"${CURRENT_HOSTED_SESSIONS}\"`)

									// Send response
									let responseData: ResponseData = {responseType: "SERVER", responseCode: _responseCodes.CONN_ACKNOWLEDGED, responseData: {message: "Success"}}
									server.send(_stringify(responseData), incomingConnectionData.port, incomingConnectionData.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`); return; } })

									// Notify the players
									currentHostedSessions[requestedSessionIndex].peers.forEach((client: RegisteredClient) => {
										if (client != currentConnectedClients[clientIndex]){
											let responseData: ResponseData = {responseType: "SESSION", responseCode: _responseCodes.SESSION_PEER_CONNECTED, responseData: {message: "Peer connected"}}
											server.send(_stringify(responseData), incomingConnectionData.port, incomingConnectionData.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`); return; } })
										}
									})

									// Notify the host
									let sessionHost: RegisteredClient = currentHostedSessions[requestedSessionIndex].host
									responseData = {responseType: "SESSION", responseCode: _responseCodes.SESSION_PEER_CONNECTED, responseData: {message: "Peer connected"}}
									server.send(_stringify(responseData), sessionHost.remoteInfo.port, sessionHost.remoteInfo.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`); return; } })

									log(`Successfully added client to session`)
								})
						})
				})
		})
}

function _sendPacketHandler(incomingConnectionData: IncomingConnection, clientToken: string): void{
	// Retrieve the payload
	let payload: object | any = incomingConnectionData.incomingData
	let packetPayload: any = payload.packetData

	// Check if data was provided
	// Ignore empty packet
	if (packetPayload == undefined){ return; }

	// Godot shenanigans
	try{
		if (typeof packetPayload === 'string'){ packetPayload = JSON.parse(packetPayload); }
	}catch{
		packetPayload = payload.packetData
	}

	// Fetch current connected clients object
	_fetchCachedData(CURRENT_CONNECTED_CLIENTS)
		.catch((error) => {
			err(`Error while fetching data from \"${CURRENT_CONNECTED_CLIENTS}\" | ${error}`)
			let responseData: ResponseData = {responseType: "SERVER", responseCode: _responseCodes.SERVER_INTERNAL_ERROR, responseData: {message: "Server error"}}
			server.send(_stringify(responseData), incomingConnectionData.port, incomingConnectionData.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`); return; } })
			return
		})
		.then((fetchedCurrentConnectedClients: any) => {
			// Log
			log(`Successfully fetched data from \"${CURRENT_CONNECTED_CLIENTS}\"`)

			// Convert the data from string to object
			let currentConnectedClients: object | any = _parse(fetchedCurrentConnectedClients)

			// Check if the client is registered
			if (!Object.hasOwn(currentConnectedClients, `${incomingConnectionData.address}:${incomingConnectionData.port}`)){
				let responseData: ResponseData = {responseType: "SERVER", responseCode: _responseCodes.CONN_NOT_REGISTERED, responseData: {message: "You are not registered to use this service"}}
				server.send(_stringify(responseData), incomingConnectionData.port, incomingConnectionData.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`); return; } })
				return
			}

			// Check if the remote is hosting or in a session
			let clientIndex: string = `${incomingConnectionData.address}:${incomingConnectionData.port}`
			let inSessionCheck: boolean = (currentConnectedClients[clientIndex].sessionData.currentSession == "") ? (false) : (true)

			if (!inSessionCheck){
				let responseData: ResponseData = {responseType: "SERVER", responseCode: _responseCodes.CONN_SESSION_NOT_FOUND, responseData: {message: "You must be in a session to send packets"}}
				server.send(_stringify(responseData), incomingConnectionData.port, incomingConnectionData.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`); return; } })
				return
			}

			// Fetch current hosted sessions object
			_fetchCachedData(CURRENT_HOSTED_SESSIONS)
				.catch((error) => {
					err(`Error while fetching data from \"${CURRENT_HOSTED_SESSIONS}\" | ${error}`)
					let responseData: ResponseData = {responseType: "SERVER", responseCode: _responseCodes.SERVER_INTERNAL_ERROR, responseData: {message: "Server error"}}
					server.send(_stringify(responseData), incomingConnectionData.port, incomingConnectionData.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`); return; } })
					return
				})
				.then((fetchedCurrentHostedSessions: any) => {
					// Log
					log(`Successfully fetched data from \"${CURRENT_HOSTED_SESSIONS}\"`)

					// Convert the data from string to object
					let currentHostedSessions: object | any = _parse(fetchedCurrentHostedSessions)

					// Fetch the session code and hosting status
					let sessionCode: string = currentConnectedClients[clientIndex].sessionData.currentSession
					let isHost: boolean = currentConnectedClients[clientIndex].sessionData.isHosting

					// Fetch the session and data
					let sessionIndex: string = `${clientToken}:${sessionCode}`
					let sessionPeers: Array<RegisteredClient> = currentHostedSessions[sessionIndex].peers
					let sessionHost: RegisteredClient = currentHostedSessions[sessionIndex].host

					// Check if the remote is the host
					// If so just iterate through all the connected peers
					if (isHost){
						// Send packet to all connected peers
						let packetData: ResponseData = {responseType: "CLIENT", responseCode: _responseCodes.CONN_ACKNOWLEDGED, responseData: packetPayload}
						sessionPeers.forEach((client: RegisteredClient) => {
							server.send(_stringify(packetData), client.remoteInfo.port, client.remoteInfo.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`); return; } })
						})
					}else{
						// Send packet to host first
						let packetData: ResponseData = {responseType: "CLIENT", responseCode: _responseCodes.CONN_ACKNOWLEDGED, responseData: packetPayload}
						server.send(_stringify(packetData), sessionHost.remoteInfo.port, sessionHost.remoteInfo.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`); return; } })

						// Send packet to all connected peers except self
						sessionPeers.forEach((client: RegisteredClient) => {
							if (currentConnectedClients[clientIndex] != client){
								server.send(_stringify(packetData), client.remoteInfo.port, client.remoteInfo.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`); return; } })
							}
						})
					}
					log(`Successfully sent packets to ${sessionPeers.length} peers`)

					// Send response code
					let responseData: ResponseData = {responseType: "SERVER", responseCode: _responseCodes.CONN_ACKNOWLEDGED, responseData: {message: "Success"}}
					server.send(_stringify(responseData), incomingConnectionData.port, incomingConnectionData.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`); return; } })
					return
				})
		})

}

function _destroySessionHandler(incomingConnectionData: IncomingConnection, clientToken: string): void{
	// Fetch current connected clients object
	_fetchCachedData(CURRENT_CONNECTED_CLIENTS)
		.catch((error) => {
			err(`Error while fetching data from \"${CURRENT_CONNECTED_CLIENTS}\" | ${error}`)
			let responseData: ResponseData = {responseType: "SERVER", responseCode: _responseCodes.SERVER_INTERNAL_ERROR, responseData: {message: "Server error"}}
			server.send(_stringify(responseData), incomingConnectionData.port, incomingConnectionData.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`); return; } })
			return
		})
		.then((fetchedCurrentConnectedClients: any) => {
			// Log
			log(`Successfully fetched data from \"${CURRENT_CONNECTED_CLIENTS}\"`)

			// Convert the data from string to object
			let currentConnectedClients: object | any = _parse(fetchedCurrentConnectedClients)

			// Check if the client is registered
			if (!Object.hasOwn(currentConnectedClients, `${incomingConnectionData.address}:${incomingConnectionData.port}`)){
				let responseData: ResponseData = {responseType: "SERVER", responseCode: _responseCodes.CONN_NOT_REGISTERED, responseData: {message: "You are not registered to use this service"}}
				server.send(_stringify(responseData), incomingConnectionData.port, incomingConnectionData.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`); return; } })
				return
			}

			// Check if the remote is hosting or in a session
			let clientIndex: string = `${incomingConnectionData.address}:${incomingConnectionData.port}`
			let inSessionCheck: boolean = (currentConnectedClients[clientIndex].sessionData.currentSession == "") ? (false) : (true)

			if (!inSessionCheck){
				let responseData: ResponseData = {responseType: "SERVER", responseCode: _responseCodes.CONN_SESSION_NOT_FOUND, responseData: {message: "You must be in a session to destroy a session"}}
				server.send(_stringify(responseData), incomingConnectionData.port, incomingConnectionData.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`); return; } })
				return
			}

			// Fetch current hosted sessions object
			_fetchCachedData(CURRENT_HOSTED_SESSIONS)
				.catch((error) => {
					err(`Error while fetching data from \"${CURRENT_HOSTED_SESSIONS}\" | ${error}`)
					let responseData: ResponseData = {responseType: "SERVER", responseCode: _responseCodes.SERVER_INTERNAL_ERROR, responseData: {message: "Server error"}}
					server.send(_stringify(responseData), incomingConnectionData.port, incomingConnectionData.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`); return; } })
					return
				})
				.then((fetchedCurrentHostedSessions: any) => {
					// Log
					log(`Successfully fetched data from \"${CURRENT_HOSTED_SESSIONS}\"`)
					
					// Convert the data from string to object
					let currentHostedSessions: object | any = _parse(fetchedCurrentHostedSessions)

					// Fetch the session code and hosting status
					let sessionCode: string = currentConnectedClients[clientIndex].sessionData.currentSession
					let isHost: boolean = currentConnectedClients[clientIndex].sessionData.isHosting
					
					// Fetch the session and data
					let sessionIndex: string = `${clientToken}:${sessionCode}`
					let sessionPeers: Array<RegisteredClient> = currentHostedSessions[sessionIndex].peers
					let sessionHost: RegisteredClient = currentHostedSessions[sessionIndex].host
					

					// Notify to all peers we destroyed the current session
					if (isHost){
						let responseData: ResponseData = {responseType: "SESSION", responseCode: _responseCodes.SESSION_DESTROYED, responseData: {message: "Session destroyed by host"}}
						sessionPeers.forEach((client: RegisteredClient) => {
							// Update the peer information
							let peerIndex: string = `${client.remoteInfo.address}:${client.remoteInfo.port}`
							currentConnectedClients[peerIndex].sessionData.currentSession = ""

							server.send(_stringify(responseData), client.remoteInfo.port, client.remoteInfo.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`); return; } })
						})

						// Update the remote
						currentConnectedClients[clientIndex].sessionData.isHosting = false
						currentConnectedClients[clientIndex].sessionData.currentSession = ""

						// Delete the session
						delete currentHostedSessions[sessionIndex]

					}else{
						// Notify to host and other peers we left the session
						let responseData: ResponseData = {responseType: "SESSION", responseCode: _responseCodes.SESSION_PEER_DISCONNECTED, responseData: {message: "Peer disconnected"}}
						server.send(_stringify(responseData), sessionHost.remoteInfo.port, sessionHost.remoteInfo.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`); return; } })

						// Notify the peers
						sessionPeers.forEach((client: RegisteredClient) => {
							if (currentConnectedClients[clientIndex] != client){
								server.send(_stringify(responseData), client.remoteInfo.port, client.remoteInfo.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`); return; } })
							}
						})

						// Update the remote
						currentConnectedClients[clientIndex].sessionData.currentSession = ""
					}

					// Write to cache
					_writeCacheData(CURRENT_CONNECTED_CLIENTS, _stringify(currentConnectedClients))
						.catch((error) => {
							err(`Error while writing data to \"${CURRENT_CONNECTED_CLIENTS}\" | ${error}`)
							let responseData: ResponseData = {responseType: "SERVER", responseCode: _responseCodes.SERVER_INTERNAL_ERROR, responseData: {message: "Server error"}}
							server.send(_stringify(responseData), incomingConnectionData.port, incomingConnectionData.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`); return; } })
							return
						})
						log(`Successfully wrote to \"${CURRENT_CONNECTED_CLIENTS}\"`)

						_writeCacheData(CURRENT_HOSTED_SESSIONS, _stringify(currentHostedSessions))
							.catch((error) => {
								err(`Error while writing data to \"${CURRENT_HOSTED_SESSIONS}\" | ${error}`)
								let responseData: ResponseData = {responseType: "SERVER", responseCode: _responseCodes.SERVER_INTERNAL_ERROR, responseData: {message: "Server error"}}
								server.send(_stringify(responseData), incomingConnectionData.port, incomingConnectionData.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`); return; } })
								return
							})
							.then(() => {
								log(`Successfully wrote to \"${CURRENT_HOSTED_SESSIONS}\"`)

								// Send response
								let responseData: ResponseData = {responseType: "SERVER", responseCode: _responseCodes.CONN_ACKNOWLEDGED, responseData: {message: "Success"}}
								server.send(_stringify(responseData), incomingConnectionData.port, incomingConnectionData.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`); return; } })
								return
							})
				})
		})
}

// Run
server.on('error', (error) => {
	err(`Error during TURN server runtime | ${error}`)
})

server.on('listening', () => {
	log(`TURN server started | ${server.address().address}:${server.address().port}`)
})

redisCache.on('error', (error) => {
	err(`Redis error | ${error}`)
})

redisCache.on('ready', () => {
	log(`Redis cache connected`)
})

redisCache.on('reconnecting', () => {
	wrn(`Redis cache connection was dropped | Attempting reconnection`)
})

_init()
server.bind(PORT)