// Imports
import dgram from 'dgram'
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
interface incomingConnection {
	route: string,
	message: any,
	address: dgram.RemoteInfo["address"],
	port: dgram.RemoteInfo["port"],
	remoteInfo: dgram.RemoteInfo,
}

interface connectedClient {
	remoteInfo: {
		address: dgram.RemoteInfo["address"],
		port: dgram.RemoteInfo["port"],
		_remote: dgram.RemoteInfo,
	},
	sessionData: {
		isHosting: boolean,
		currentSession: string,
	},
}

interface sessionObject{
	host: connectedClient,
	peers: Array<connectedClient>,
	code: string,
	sessionSettings: {
		maxPlayers: number,
		sessionName: string,
	},
}

interface responseCodes {
	CONN_ACKNOWLEDGED: string,
	CONN_ALREADY_REGISTERED: string,
	CONN_NOT_REGISTERED: string,
	CONN_ALREADY_HOSTING: string,
	CONN_ALREADY_IN_SESSION: string,
	CONN_SESSION_NOT_FOUND: string,
	AUTH_TOKENS_NOT_PROVIDED: string,
	AUTH_INVALID_TOKEN: string
	SERVER_INTERNAL_ERROR: string,
}

// interface responseCodes {
// 	CONN_ACKNOWLEDGED: string,
// 	CONN_ESTABLISHED: string,
// 	CONN_NOT_REGISTERED: string
// 	CONN_ALR_HOSTING: string,
// 	CONN_ALR_IN_SESSION: string,
// 	CONN_SESSION_NOT_FOUND: string,
// 	AUTH_ACCESS_TOKEN_INVALID: string,
// 	AUTH_CLIENT_TOKEN_INVALID: string,
// 	SERVER_HEARTBEAT: string,
// 	SERVER_ERROR: string
// }

interface responseData {
	responseType: string,
	responseCode: string
	responseMessage: Object
}

// Constants
const server = dgram.createSocket('udp6')
const redisCache: RedisClientType = createClient({socket: { host: '192.168.1.144', port: 36202 }})

// ENV Constants
const CURRENT_CONNECTED_CLIENTS: string = 'currentConnectedClients'
const CURRENT_HOSTED_SESSIONS: string = 'currentHostedSessions'
const PORT: number = Number(process.env.UDPPT_LISTEN_PORT)

// Public Variables

// Private Variables
var _pastConnectedClients: Object = {}
var _pastHostedSessions: Object = {}
var _responseCodes: responseCodes = {
	CONN_ACKNOWLEDGED: "CONN_ACKNOWLEDGED",
	CONN_ALREADY_REGISTERED: "CONN_ALREADY_REGISTERED",
	CONN_NOT_REGISTERED: "CONN_NOT_REGISTERED",
	CONN_ALREADY_HOSTING: "CONN_ALREADY_HOSTING",
	CONN_ALREADY_IN_SESSION: "CONN_ALREADY_IN_SESSION",
	CONN_SESSION_NOT_FOUND: "CONN_SESSION_NOT_FOUND",
	AUTH_TOKENS_NOT_PROVIDED: "AUTH_TOKENS_NOT_PROVIDED",
	AUTH_INVALID_TOKEN: "AUTH_INVALID_TOKEN",
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
}

// Public Methods
server.on('message', (message: Buffer, remoteInfo: dgram.RemoteInfo) => {
	// Decode the incoming JSON data
	let decodedMessage: any = JSON.parse(message.toString())
	let connection: incomingConnection = {
		route: decodedMessage.route,
		message: decodedMessage,
		address: remoteInfo.address,
		port: remoteInfo.port,
		remoteInfo: remoteInfo
	}

	// Authorization middleware
	_authorizedConnection(connection)
		.catch((error) => {
			if (error){ err(`Error while sending response data | ${error}`) }
		})
		.then((validationData: object | any) => {
			if (validationData.authorized){
				switch (connection.route){
					case "registerClient":
						_registerClientHandler(connection)
						break
					
					case "createSession":
						_createSessionHandler(connection, validationData.clientToken)
						break
					
					case "findSessions":
						_findSessionsHandler(connection, validationData.clientToken)
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

function _generateSessionCode(): string{
	return randomBytes(10).toString('hex')
}

// Middleware
function _authorizedConnection(connectionData: incomingConnection): Promise<object> {
	return new Promise((resolve, reject) => {
		// Retrieve tokens
		let combinedTokens: Array<string> = connectionData.message.authorizationBearer.split(":")
		let accessToken: string = combinedTokens[0]
		let clientToken: string = combinedTokens[1]

		// Check if we have tokens
		if (accessToken == undefined || clientToken == undefined){
			let responseData: responseData = {responseType: "SERVER", responseCode: _responseCodes.AUTH_TOKENS_NOT_PROVIDED, responseMessage: "Access and client token not provided"}
			server.send(JSON.stringify(responseData), connectionData.port, connectionData.address, (error) => { reject(error) })
			resolve({authorized: false, authorizedUserData: {}})
		}
		
		// Validate tokens
		validateAccessToken(accessToken, clientToken)
			.catch((error) => {
				let responseData: responseData = {responseType: "SERVER", responseCode: _responseCodes.AUTH_INVALID_TOKEN, responseMessage: error.message}
				server.send(JSON.stringify(responseData), connectionData.port,connectionData.address, (error) => { reject(error) })
				resolve({authorized: false, authorizedUserData: {}})
			})
			.then((validationData) => {
				if (!validationData) { resolve([false, {}]) }
				resolve({authorized: validationData.isValid, clientToken: clientToken})
			})
	})
}

// "Routes"
function _registerClientHandler(connectionData: incomingConnection): void{
	// Fetch current connected clients
	_fetchCachedData(CURRENT_CONNECTED_CLIENTS)
		.catch((error) => {
			err(`Error while fetching cached data from \"${CURRENT_CONNECTED_CLIENTS}\" | ${error}`)
			let responseData: responseData = {responseType: "SERVER", responseCode: _responseCodes.SERVER_INTERNAL_ERROR, responseMessage: "Server error"}
			server.send(JSON.stringify(responseData), connectionData.port, connectionData.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`) } })
			return
		})
		.then((fetchedData: any) => {
			// Parse the data
			let currentConnectedClients: Object | any = JSON.parse(fetchedData)

			// Check if remote is already registered
			if (Object.hasOwn(currentConnectedClients, `${connectionData.address}:${connectionData.port}`)){
				let responseData: responseData = {responseType: "SERVER", responseCode: _responseCodes.CONN_ALREADY_REGISTERED, responseMessage: "You are already registered | De-register before registering again"}
				server.send(JSON.stringify(responseData), connectionData.port, connectionData.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`) } })
				return
			}

			// Create new client object
			let newClient: connectedClient = {
				remoteInfo: {
					address: connectionData.address,
					port: connectionData.port,
					_remote: connectionData.remoteInfo
				},
				sessionData: {
					isHosting: false,
					currentSession: "",
				},
			}

			// Add client
			let index: string = `${newClient.remoteInfo.address}:${newClient.remoteInfo.port}`
			currentConnectedClients[index] = newClient

			// Write to cache
			_writeCacheData(CURRENT_CONNECTED_CLIENTS, JSON.stringify(currentConnectedClients))
				.catch((error) => {
					err(`Error while writing cached data to \"${CURRENT_CONNECTED_CLIENTS}\" | ${error}`)
					let responseData: responseData = {responseType: "SERVER", responseCode: _responseCodes.SERVER_INTERNAL_ERROR, responseMessage: "Server error"}
					server.send(JSON.stringify(responseData), connectionData.port, connectionData.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`) } })
					return
				})
				.then(() => {
					log(`Successfully wrote data to \"${CURRENT_CONNECTED_CLIENTS}\"`)
					let responseData: responseData = {responseType: "SERVER", responseCode: _responseCodes.CONN_ACKNOWLEDGED, responseMessage: "Success"}
					server.send(JSON.stringify(responseData), connectionData.port, connectionData.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`) } })
					return
				})
		})
}

function _createSessionHandler(connectionData: incomingConnection, clientToken: string): void{
	// Fetch current connected clients
	_fetchCachedData(CURRENT_CONNECTED_CLIENTS)
		.catch((error) => {
			err(`Error while fetching cached data from \"${CURRENT_CONNECTED_CLIENTS}\" | ${error}`)
			let responseData: responseData = {responseType: "SERVER", responseCode: _responseCodes.SERVER_INTERNAL_ERROR, responseMessage: "Server error"}
			server.send(JSON.stringify(responseData), connectionData.port, connectionData.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`) } })
			return
		})
		.then((fetchedConnectedClients: any) => {
			// Parse the data
			let currentConnectedClients: Object | any = JSON.parse(fetchedConnectedClients)

			/**
			 * Check if remote is
			 * 1. Registered client
			 * 2. Not hosting
			 * 3. Not in a session
			 */

			// Check if registered
			if (!Object.hasOwn(currentConnectedClients, `${connectionData.address}:${connectionData.port}`)){
				let responseData: responseData = {responseType: "SERVER", responseCode: _responseCodes.CONN_NOT_REGISTERED, responseMessage: "You are currently not registered | Registered now to use this feature"}
				server.send(JSON.stringify(responseData), connectionData.port, connectionData.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`) } })
				return
			}

			let index: string = `${connectionData.address}:${connectionData.port}`
			let isHosting: boolean = currentConnectedClients[index].sessionData.isHosting
			let inSession: boolean = (currentConnectedClients[index].sessionData.currentSession == "" ? (false) : (true))

			// Check if hosting
			if (isHosting){
				let responseData: responseData = {responseType: "SERVER", responseCode: _responseCodes.CONN_ALREADY_HOSTING, responseMessage: "You are already hosting a session | Destroy your current session before making a new one"}
				server.send(JSON.stringify(responseData), connectionData.port, connectionData.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`) } })
				return
			}

			// Check if in session
			if (inSession){
				let responseData: responseData = {responseType: "SERVER", responseCode: _responseCodes.CONN_ALREADY_IN_SESSION, responseMessage: "You are currently in a session | Destroy your current session before making a session"}
				server.send(JSON.stringify(responseData), connectionData.port, connectionData.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`) } })
				return
			}

			// Create new session
			_fetchCachedData(CURRENT_HOSTED_SESSIONS)
				.catch((error) => {
					err(`Error while fetching cached data from \"${CURRENT_HOSTED_SESSIONS}\" | ${error}`)
					let responseData: responseData = {responseType: "SERVER", responseCode: _responseCodes.SERVER_INTERNAL_ERROR, responseMessage: "Server error"}
					server.send(JSON.stringify(responseData), connectionData.port, connectionData.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`) } })
					return
				})
				.then((fetchedHostedSessions: any) => {
					// Parse the data
					let currentHostedSessions: Object | any = JSON.parse(fetchedHostedSessions)

					// Generate a new session code
					let sessionCode: string = _generateSessionCode()

					// Update the client
					currentConnectedClients[index].sessionData.isHosting = true
					currentConnectedClients[index].sessionData.currentSession = sessionCode

					// Create a new session object
					let host: connectedClient = currentConnectedClients[index]
					let newSession: sessionObject = {host: host, peers: [], code: sessionCode, sessionSettings: {maxPlayers: connectionData.message.maxPlayers, sessionName: connectionData.message.sessionName}}

					// Update the hosted sessions object
					let sessionIndex: string = `${sessionCode}:${clientToken}`
					currentHostedSessions[sessionIndex] = newSession

					// Write to cache
					// Note: If the "currentHostedSessions" write errors out, then we have a created session with no actual session
					// if that makes sense
					_writeCacheData(CURRENT_CONNECTED_CLIENTS, JSON.stringify(currentConnectedClients))
						.catch((error) => {
							err(`Error while writing cached data to \"${CURRENT_CONNECTED_CLIENTS}\" | ${error}`)
							let responseData: responseData = {responseType: "SERVER", responseCode: _responseCodes.SERVER_INTERNAL_ERROR, responseMessage: "Server error"}
							server.send(JSON.stringify(responseData), connectionData.port, connectionData.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`) } })
							return
						})
						.then(() => {
							log(`Successfully wrote data to \"${CURRENT_CONNECTED_CLIENTS}\"`)
							
							// Write to cache
							_writeCacheData(CURRENT_HOSTED_SESSIONS, JSON.stringify(currentHostedSessions))
								.catch((error) => {
									err(`Error while fetching cached data from \"${CURRENT_HOSTED_SESSIONS}\" | ${error}`)
									let responseData: responseData = {responseType: "SERVER", responseCode: _responseCodes.SERVER_INTERNAL_ERROR, responseMessage: "Server error"}
									server.send(JSON.stringify(responseData), connectionData.port, connectionData.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`) } })
									return
								})
								.then(() => {
									log(`Successfully wrote data to \"${CURRENT_HOSTED_SESSIONS}\"`)

									let responseData: responseData = {responseType: "SERVER", responseCode: _responseCodes.CONN_ACKNOWLEDGED, responseMessage: "Success"}
									server.send(JSON.stringify(responseData), connectionData.port, connectionData.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`) } })
									return
								})
						})

				})
		})
}

function _findSessionsHandler(connectionData: incomingConnection, clientToken: string): void{
	// Fetch current connected clients
	_fetchCachedData(CURRENT_CONNECTED_CLIENTS)
		.catch((error) => {
			err(`Error while fetching cached data from \"${CURRENT_CONNECTED_CLIENTS}\" | ${error}`)
			let responseData: responseData = {responseType: "SERVER", responseCode: _responseCodes.SERVER_INTERNAL_ERROR, responseMessage: "Server error"}
			server.send(JSON.stringify(responseData), connectionData.port, connectionData.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`) } })
			return
		})
		.then((fetchedConnectedClients: any) => {
			// Parse the data
			let currentConnectedClients: Object | any = JSON.parse(fetchedConnectedClients)

			// Check if registered
			if (!Object.hasOwn(currentConnectedClients, `${connectionData.address}:${connectionData.port}`)){
				let responseData: responseData = {responseType: "SERVER", responseCode: _responseCodes.CONN_NOT_REGISTERED, responseMessage: "You are currently not registered | Registered now to use this feature"}
				server.send(JSON.stringify(responseData), connectionData.port, connectionData.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`) } })
				return
			}

			_fetchCachedData(CURRENT_HOSTED_SESSIONS)
				.catch((error) => {
					err(`Error while fetching cached data from \"${CURRENT_HOSTED_SESSIONS}\" | ${error}`)
					let responseData: responseData = {responseType: "SERVER", responseCode: _responseCodes.SERVER_INTERNAL_ERROR, responseMessage: "Server error"}
					server.send(JSON.stringify(responseData), connectionData.port, connectionData.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`) } })
					return
				})
				.then((fetchedHostedSessions: any) => {
					// Parse the data
					let currentHostedSessions: Object | any = JSON.parse(fetchedHostedSessions)

					// Get a copy of all the sessions
					// THIS IS REALLY FUCKING INEFFICIENT
					// TODO: OPTIMIZE
					let returnSessions: Array<object> = []
					let allSessions: Array<string> = Object.keys(currentHostedSessions)
					allSessions.forEach((keyValue: string) => {
						 if (keyValue.includes(clientToken)){
							// Get the session data
							let sessionCode: string = keyValue.split(":")[0]
							let sessionName: string = currentHostedSessions[keyValue].sessionSettings.sessionName
							let maxPlayers: number = currentHostedSessions[keyValue].sessionSettings.maxPlayers
							let currentPlayers: number = currentHostedSessions[keyValue].peers.length
							
							// Update return array
							returnSessions.push({sessionCode: sessionCode, sessionName: sessionName, maxPlayers: maxPlayers, currentPlayers: currentPlayers})
						 }
					})

					// Send data
					let responseData: responseData = {responseType: "SERVER", responseCode: _responseCodes.CONN_ACKNOWLEDGED, responseMessage: {message: "Success", foundSessions: returnSessions}}
					server.send(JSON.stringify(responseData), connectionData.port, connectionData.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`) } })
					return
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