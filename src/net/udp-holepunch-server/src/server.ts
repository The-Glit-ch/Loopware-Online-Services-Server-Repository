// Imports
import { createClient, RedisClientType } from '@redis/client'
import { createHash, randomBytes } from 'crypto'
import { createSocket, RemoteInfo } from 'dgram'
import { config } from 'dotenv'
import { join } from 'path'
import { decodeJWT, validateAccessToken } from '../../../../shared/authorization-module/src/authorization_module'
import { log, wrn, err } from '../../../../shared/logging-module/src/logging_module'
let _environmentLoadingError: Error | undefined = config({path: join(process.cwd(), './.env/.lossConfig.env')}).error

// Docstring
/**
 * Loopware Online Subsystem @ UDP Punchthrough Server || Provides a custom TURN server that allows for
 * multiplayer without the need for port forwarding. Each session is isolated so that only people with the same client token can access
 * the same session. This allows for one server to handle and host multiple sessions from multiple apps/games | Info on how this works -> https://en.wikipedia.org/wiki/UDP_hole_punching
 */

// Enums

// Interface
interface IncomingConnection {
	authorizationHeader: string,
	requestedRoute: string,
	payload: object | any,
	address: string,
	port: number,
}

interface RegisteredClient {
	remoteInfo: {
		address: string,
		port: number,
	},
	sessionData: {
		inSession: boolean,
		isSessionHost: boolean,
		currentSessionCode: string,
		currentSessionPeerID: string,
	},
	clientToken: string,
}

interface TurnSession {
	host: RegisteredClient,
	peers: Array<RegisteredClient>,
	sessionSettings: {
		sessionName: string,
		sessionMaxConnections: number,
		isSessionVisible: boolean,
		sessionPassword: string,
	},
}

interface SessionSearchResult {
	sessionCode: string,
	sessionName: string,
	currentPlayerCount: number,
	maxPlayerCount: number,
	requiresPassword: boolean
}

interface ResponseData {
	responseType: string,
	responseCode: string,
	responseData: object,
}

interface ResponseCodes {
	CONN_ACKNOWLEDGED: string,
	CONN_INVALID_BODY: string,
	CONN_NOT_REGISTERED: string,
	CONN_ALREADY_REGISTERED: string,
	CONN_ALREADY_HOSTING_SESSION: string,
	CONN_ALREADY_IN_SESSION: string,
	SESSION_PEER_CONNECTED: string,
	SESSION_PEER_DISCONNECTED: string,
	SESSION_SESSION_DESTROYED: string,
	SESSION_REQUESTED_SESSION_NOT_FOUND: string,
	SESSION_REQUESTED_SESSION_FULL: string,
	SESSION_SESSION_PASSWORD_INVALID: string,
	AUTH_INVALID_ENCRYPT_KEY: string,
	AUTH_ACCESS_TOKEN_NOT_PROVIDED: string,
	AUTH_CLIENT_TOKEN_NOT_PROVIDED: string,
	AUTH_INVALID_TOKENS: string,
	SERVER_HEARTBEAT: string
	SERVER_INTERNAL_ERROR: string,
}



// Constants
const server = createSocket('udp6')
const redisCache: RedisClientType = createClient({socket: { host: String(process.env.UDPPT_REDIS_CACHE_HOST), port: Number(process.env.UDPPT_REDIS_CACHE_PORT) }})
const CURRENT_CONNECTED_CLIENTS: string = 'currentConnectedClients'
const CURRENT_HOSTED_SESSIONS: string = 'currentHostedSessions'

// ENV Constants
const PORT: number = Number(process.env.UDPPT_LISTEN_PORT)
const ENCRYPTION_KEY: string = String(process.env.UDPPT_ENCRYPTION_KEY)

// Public Variables

// Private Variables
var _pastConnectedClients: object | any = {}
var _responseCodes: ResponseCodes = {
	CONN_ACKNOWLEDGED: "CONN_ACKNOWLEDGED",
	CONN_INVALID_BODY: "CONN_INVALID_BODY",
	CONN_NOT_REGISTERED: "CONN_NOT_REGISTERED",
	CONN_ALREADY_REGISTERED: "CONN_ALREADY_REGISTERED",
	CONN_ALREADY_HOSTING_SESSION: "CONN_ALREADY_HOSTING_SESSION",
	CONN_ALREADY_IN_SESSION: "CONN_ALREADY_IN_SESSION",
	SESSION_PEER_CONNECTED: "SESSION_PEER_CONNECTED",
	SESSION_PEER_DISCONNECTED: "SESSION_PEER_DISCONNECTED",
	SESSION_SESSION_DESTROYED: "SESSION_SESSION_DESTROYED",
	SESSION_REQUESTED_SESSION_NOT_FOUND: "SESSION_REQUESTED_SESSION_NOT_FOUND",
	SESSION_REQUESTED_SESSION_FULL: "SESSION_REQUESTED_SESSION_FULL",
	SESSION_SESSION_PASSWORD_INVALID: "SESSION_SESSION_PASSWORD_INVALID",
	AUTH_INVALID_ENCRYPT_KEY: "AUTH_INVALID_ENCRYPT_KEY",
	AUTH_ACCESS_TOKEN_NOT_PROVIDED: "AUTH_ACCESS_TOKEN_NOT_PROVIDED",
	AUTH_CLIENT_TOKEN_NOT_PROVIDED: "AUTH_CLIENT_TOKEN_NOT_PROVIDED",
	AUTH_INVALID_TOKENS: "AUTH_INVALID_TOKENS",
	SERVER_HEARTBEAT: "SERVER_HEARTBEAT",
	SERVER_INTERNAL_ERROR: "SERVER_INTERNAL_ERROR",
}

// _init()
async function _init(): Promise<void>{
	// Sanity check
	if (_environmentLoadingError != undefined){ wrn(`.ENV file was not successfully loaded | ${_environmentLoadingError.message}`) }

	// Connect to redis cache
	await redisCache.connect()

	// Initialize caches
	await _writeCacheData(CURRENT_CONNECTED_CLIENTS, _stringifyData({}))
	await _writeCacheData(CURRENT_HOSTED_SESSIONS, _stringifyData({}))

	// Start the heartbeat
	setInterval(() => {_serverHeartbeat()}, 5000)

}

// Public Methods
server.on('message', (messageBuffer: Buffer, remoteInfo: RemoteInfo) => {
	// Decode the message buffer into a JSON object
	let decodedMessage: object | any = JSON.parse(messageBuffer.toString('utf-8'))

	// Create new incoming connection object
	let incomingClientConnection: IncomingConnection = {
		authorizationHeader: decodedMessage.authorizationHeader,
		requestedRoute: decodedMessage.requestedRoute,
		payload: decodedMessage.payload,
		address: remoteInfo.address,
		port: remoteInfo.port
	}

	// Log
	log(`New UDP connection from \"${incomingClientConnection.address}:${incomingClientConnection.port}\" heading to \"${incomingClientConnection.requestedRoute}\"`)

	// Authorization middleware
	_authorizeConnection(incomingClientConnection)
		.then((validationData: object | any) => {
			let isValid: boolean = validationData.isValid
			let clientToken: string = validationData.clientToken

			if (isValid){
				switch (incomingClientConnection.requestedRoute){
					case "registerClient":
						_registerClientHandler(incomingClientConnection, clientToken)
						break
					
					case "createSession":
						_createSessionHandler(incomingClientConnection, clientToken)
						break
					
					case "findSessions":
						_findSessionsHandler(incomingClientConnection, clientToken)
						break
					
					case "joinSession":
						_joinSessionHandler(incomingClientConnection, clientToken)
						break
					
					case "sendPacket":
						_sendPacketHandler(incomingClientConnection, clientToken)
						break
					
					case "destroySession":
						_destroySessionHandler(incomingClientConnection, clientToken)
						break
					
					case "clientHeartbeat":
						_clientHeartbeatHandler(incomingClientConnection)
						break
				}
			}
		})
})

// Middleware
function _authorizeConnection(incomingClientConnection: IncomingConnection): Promise<object>{
	return new Promise((resolve, _reject) => {
		// Decode the header
		let authorizationHeader: string = incomingClientConnection.authorizationHeader

		decodeJWT(authorizationHeader, ENCRYPTION_KEY)
			.catch((error) => {
				err(`Error while decoding encrypted tokens | ${error}`)
				let responseData: ResponseData = {
					responseType: "SERVER",
					responseCode: _responseCodes.AUTH_INVALID_ENCRYPT_KEY,
					responseData: {message: "Invalid encryption key"},
				}
				server.send(_stringifyData(responseData), incomingClientConnection.port, incomingClientConnection.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`); return; } })
				resolve({isValid: false, clientToken: ""})
			})
			.then((decodedToken: object | any) => {
				if (!decodedToken){ return; }

				// Retrieve access and client token
				let accessToken: string = decodedToken.accessToken
				let clientToken: string = decodedToken.clientToken

				// Check if tokens were provided
				if (accessToken == undefined){
					let responseData: ResponseData = {
						responseType: "SERVER",
						responseCode: _responseCodes.AUTH_ACCESS_TOKEN_NOT_PROVIDED,
						responseData: {message: "Access token not provided"},
					}
					server.send(_stringifyData(responseData), incomingClientConnection.port, incomingClientConnection.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`); return; } })
					resolve({isValid: false, clientToken: ""})
				}

				if (clientToken == undefined){
					let responseData: ResponseData = {
						responseType: "SERVER",
						responseCode: _responseCodes.AUTH_CLIENT_TOKEN_NOT_PROVIDED,
						responseData: {message: "Client token not provided"},
					}
					server.send(_stringifyData(responseData), incomingClientConnection.port, incomingClientConnection.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`); return; } })
					resolve({isValid: false, clientToken: ""})
				}

				// Validate the tokens
				validateAccessToken(accessToken, clientToken)
					.catch((error) => {
						let responseData: ResponseData = {
							responseType: "SERVER",
							responseCode: _responseCodes.SERVER_INTERNAL_ERROR,
							responseData: {message: error.message},
						}
						server.send(_stringifyData(responseData), incomingClientConnection.port, incomingClientConnection.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`); return; } })
						resolve({isValid: false, clientToken: ""})
					})
					.then((validationData: object | any) => {
						// No data received
						if (!validationData){ return; }

						// Verification failed
						if (validationData.code != 200){
							let responseData: ResponseData = {
								responseType: "SERVER",
								responseCode: _responseCodes.AUTH_INVALID_TOKENS,
								responseData: {message: validationData.message}
							}
							server.send(_stringifyData(responseData), incomingClientConnection.port, incomingClientConnection.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`); return; } })
							resolve({isValid: false, clientToken: ""})
						}
						
						// Return data
						let verificationData: object | any = validationData.data
						resolve({isValid: verificationData.isValid, clientToken: clientToken})
					})
			})
	})
}

// Routes
function _registerClientHandler(incomingClientConnection: IncomingConnection, clientToken: string): void{
	// Fetch current connected clients
	_fetchCachedData(CURRENT_CONNECTED_CLIENTS)
		.catch((error) => {
			err(`registerClientHandler | Error while fetching data from \"${CURRENT_CONNECTED_CLIENTS}\" cache | ${error}`)
			let responseData: ResponseData = {
				responseType: "SERVER",
				responseCode: _responseCodes.SERVER_INTERNAL_ERROR,
				responseData: {message: "Server error"},
			}
			server.send(_stringifyData(responseData), incomingClientConnection.port, incomingClientConnection.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`); return; } })
			return
		})
		.then((fetchedCurrentConnectedClients: any) => {
			// Log
			log(`registerClientHandler | Fetched data from \"${CURRENT_CONNECTED_CLIENTS}\" cache`)

			// Convert the data from string to object
			let currentConnectedClients: object | any = _parseData(fetchedCurrentConnectedClients)

			// Check if the remote is already registered
			let clientIndex: string = `${incomingClientConnection.address}:${incomingClientConnection.port}`
			if (Object.hasOwn(currentConnectedClients, clientIndex)){
				let responseData: ResponseData = {
					responseType: "SERVER",
					responseCode: _responseCodes.CONN_ALREADY_REGISTERED,
					responseData: {message: "You are already registered"},
				}
				server.send(_stringifyData(responseData), incomingClientConnection.port, incomingClientConnection.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`); return; } })
				return
			}

			// Create a new client object
			let newClientObject: RegisteredClient = {
				remoteInfo: {
					address: incomingClientConnection.address,
					port: incomingClientConnection.port,
				},
				sessionData: {
					inSession: false,
					isSessionHost: false,
					currentSessionCode: "",
					currentSessionPeerID: "",
				},
				clientToken: clientToken
			}

			// Add client to current connected clients object
			currentConnectedClients[clientIndex] = newClientObject

			// Write data to cache
			_writeCacheData(CURRENT_CONNECTED_CLIENTS, _stringifyData(currentConnectedClients))
				.catch((error) => {
					err(`registerClientHandler | Error while writing data to \"${CURRENT_CONNECTED_CLIENTS}\" cache | ${error}`)
					let responseData: ResponseData = {
						responseType: "SERVER",
						responseCode: _responseCodes.SERVER_INTERNAL_ERROR,
						responseData: {message: "Server error"},
					}
					server.send(_stringifyData(responseData), incomingClientConnection.port, incomingClientConnection.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`); return; } })
					return
				})
				.then(() => {
					// Log
					log(`New client registered | ${clientIndex}`)

					let responseData: ResponseData = {
						responseType: "SERVER",
						responseCode: _responseCodes.CONN_ACKNOWLEDGED,
						responseData: {message: "Success"},
					}
					server.send(_stringifyData(responseData), incomingClientConnection.port, incomingClientConnection.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`); return; } })
					return
				})
		})
}

function _createSessionHandler(incomingClientConnection: IncomingConnection, clientToken: string): void{
	// Retrieve the payload
	let payload: object | any = incomingClientConnection.payload
	let sessionName: string = payload.sessionName
	let sessionMaxConnections: number = payload.sessionMaxConnections
	let isSessionVisible: boolean = payload.isSessionVisible
	let sessionPassword: string = payload.sessionPassword

	// Check if data was provided and fallback to defaults
	if (sessionMaxConnections == undefined){ sessionMaxConnections = 10 }
	if (sessionName == undefined){ sessionName = "" }
	if (isSessionVisible == undefined){ isSessionVisible = true }
	if (sessionPassword == undefined){ sessionPassword = "" }

	// Fetch current connected clients
	_fetchCachedData(CURRENT_CONNECTED_CLIENTS)
		.catch((error) => {
			err(`createSessionHandler | Error while fetching data from \"${CURRENT_CONNECTED_CLIENTS}\" cache | ${error}`)
			let responseData: ResponseData = {
				responseType: "SERVER",
				responseCode: _responseCodes.SERVER_INTERNAL_ERROR,
				responseData: {message: "Server error"},
			}
			server.send(_stringifyData(responseData), incomingClientConnection.port, incomingClientConnection.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`); return; } })
			return
		})
		.then((fetchedCurrentConnectedClients: any) => {
			// Log
			log(`createSessionHandler | Fetched data from \"${CURRENT_CONNECTED_CLIENTS}\" cache`)

			// Convert the data from string to object
			let currentConnectedClients: object | any = _parseData(fetchedCurrentConnectedClients)

			// Check if the remote is registered
			let clientIndex: string = `${incomingClientConnection.address}:${incomingClientConnection.port}`
			if (!Object.hasOwn(currentConnectedClients, clientIndex)){
				let responseData: ResponseData = {
					responseType: "SERVER",
					responseCode: _responseCodes.CONN_NOT_REGISTERED,
					responseData: {message: "You are not registered to use this service"},
				}
				server.send(_stringifyData(responseData), incomingClientConnection.port, incomingClientConnection.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`); return; } })
				return
			}

			// Check if the remote is currently hosting a session or in a session
			let inSession: boolean = currentConnectedClients[clientIndex].sessionData.inSession
			if (inSession){
				let isHosting: boolean = currentConnectedClients[clientIndex].sessionData.isSessionHost
				if (isHosting){
					let responseData: ResponseData = {
						responseType: "SERVER",
						responseCode: _responseCodes.CONN_ALREADY_HOSTING_SESSION,
						responseData: {message: "You are already hosting a session"},
					}
					server.send(_stringifyData(responseData), incomingClientConnection.port, incomingClientConnection.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`); return; } })
					return
				}else{
					let responseData: ResponseData = {
						responseType: "SERVER",
						responseCode: _responseCodes.CONN_ALREADY_IN_SESSION,
						responseData: {message: "You are currently in a session"},
					}
					server.send(_stringifyData(responseData), incomingClientConnection.port, incomingClientConnection.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`); return; } })
					return
				}
			}

			// Fetch current hosted sessions
			_fetchCachedData(CURRENT_HOSTED_SESSIONS)
				.catch((error) => {
					err(`createSessionHandler | Error while fetching data from \"${CURRENT_HOSTED_SESSIONS}\" cache | ${error}`)
					let responseData: ResponseData = {
						responseType: "SERVER",
						responseCode: _responseCodes.SERVER_INTERNAL_ERROR,
						responseData: {message: "Server error"},
					}
					server.send(_stringifyData(responseData), incomingClientConnection.port, incomingClientConnection.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`); return; } })
					return
				})
				.then((fetchedCurrentHostedSessions: any) => {
					// Log
					log(`createSessionHandler | Fetched data from \"${CURRENT_HOSTED_SESSIONS}\" cache`)

					// Convert the data from string to object
					let currentHostedSessions: object | any = _parseData(fetchedCurrentHostedSessions)

					// Setup data for new session
					let sessionCode: string = _generateSessionCode()
					if (sessionName == ""){ sessionName = `session-${Object.keys(currentHostedSessions).length}` }
					if (sessionPassword != ""){ sessionPassword = createHash('sha256').update(sessionPassword).digest('base64') }


					// Create a new session object
					let newSessionObject: TurnSession = {
						host: currentConnectedClients[clientIndex],
						peers: [],
						sessionSettings: {
							sessionName: sessionName,
							sessionMaxConnections: sessionMaxConnections,
							isSessionVisible: isSessionVisible,
							sessionPassword: sessionPassword,
						},
					}

					// Update the client
					currentConnectedClients[clientIndex].sessionData.inSession = true
					currentConnectedClients[clientIndex].sessionData.isSessionHost = true
					currentConnectedClients[clientIndex].sessionData.currentSessionCode = sessionCode
					currentConnectedClients[clientIndex].sessionData.currentSessionPeerID = "1"

					// Update the current sessions object
					let sessionIndex: string = `${clientToken}:${sessionCode}`
					currentHostedSessions[sessionIndex] = newSessionObject

					// Write data
					// NOTE: If something errors out here its not really a big deal
					// The server heartbeat *should* take care of it
					_writeCacheData(CURRENT_CONNECTED_CLIENTS, _stringifyData(currentConnectedClients))
						.catch((error) => {
							err(`createSessionHandler | Error while writing data to \"${CURRENT_CONNECTED_CLIENTS}\" cache | ${error}`)
							let responseData: ResponseData = {
								responseType: "SERVER",
								responseCode: _responseCodes.SERVER_INTERNAL_ERROR,
								responseData: {message: "Server error"},
							}
							server.send(_stringifyData(responseData), incomingClientConnection.port, incomingClientConnection.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`); return; } })
							return
						})
						.then(() => {
							_writeCacheData(CURRENT_HOSTED_SESSIONS, _stringifyData(currentHostedSessions))
								.catch((error) => {
									err(`createSessionHandler | Error while writing data to \"${CURRENT_HOSTED_SESSIONS}\" cache | ${error}`)
									let responseData: ResponseData = {
										responseType: "SERVER",
										responseCode: _responseCodes.SERVER_INTERNAL_ERROR,
										responseData: {message: "Server error"},
									}
									server.send(_stringifyData(responseData), incomingClientConnection.port, incomingClientConnection.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`); return; } })
									return
								})
								.then(() => {
									// Log
									log(`New session created | Host: ${clientIndex} | Name: ${sessionName} | Code: ${sessionCode}`)

									let responseData: ResponseData = {
										responseType: "SERVER",
										responseCode: _responseCodes.CONN_ACKNOWLEDGED,
										responseData: {message: "Success", sessionCode: sessionCode},
									}
									server.send(_stringifyData(responseData), incomingClientConnection.port, incomingClientConnection.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`); return; } })
									return
								})
						})
				})
		})
}

function _findSessionsHandler(incomingClientConnection: IncomingConnection, clientToken: string): void{
	// Retrieve the payload
	let payload: object | any = incomingClientConnection.payload
	let maxReturnResults: number = payload.maxResults

	// Check if data was provided
	if (maxReturnResults == undefined){ maxReturnResults = 10 }

	// Fetch current connected clients
	_fetchCachedData(CURRENT_CONNECTED_CLIENTS)
		.catch((error) => {
			err(`findSessionsHandler | Error while fetching data from \"${CURRENT_CONNECTED_CLIENTS}\" cache | ${error}`)
			let responseData: ResponseData = {
				responseType: "SERVER",
				responseCode: _responseCodes.SERVER_INTERNAL_ERROR,
				responseData: {message: "Server error"},
			}
			server.send(_stringifyData(responseData), incomingClientConnection.port, incomingClientConnection.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`); return; } })
			return
		})
		.then((fetchedCurrentConnectedClients: any) => {
			// Log
			log(`findSessionsHandler | Fetched data from \"${CURRENT_CONNECTED_CLIENTS}\" cache`)
		
			// Convert the data from string to object
			let currentConnectedClients: object | any = _parseData(fetchedCurrentConnectedClients)

			// Check if the remote is registered
			let clientIndex: string = `${incomingClientConnection.address}:${incomingClientConnection.port}`
			if (!Object.hasOwn(currentConnectedClients, clientIndex)){
				let responseData: ResponseData = {
					responseType: "SERVER",
					responseCode: _responseCodes.CONN_NOT_REGISTERED,
					responseData: {message: "You are not registered to use this service"},
				}
				server.send(_stringifyData(responseData), incomingClientConnection.port, incomingClientConnection.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`); return; } })
				return
			}

			// Fetch current hosted sessions
			_fetchCachedData(CURRENT_HOSTED_SESSIONS)
				.catch((error) => {
					err(`findSessionsHandler | Error while fetching data from \"${CURRENT_HOSTED_SESSIONS}\" cache | ${error}`)
					let responseData: ResponseData = {
						responseType: "SERVER",
						responseCode: _responseCodes.SERVER_INTERNAL_ERROR,
						responseData: {message: "Server error"},
					}
					server.send(_stringifyData(responseData), incomingClientConnection.port, incomingClientConnection.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`); return; } })
					return
				})
				.then((fetchedCurrentHostedSessions: any) => {
					// Log
					log(`findSessionsHandler | Fetched data from \"${CURRENT_HOSTED_SESSIONS}\" cache`)

					// Convert the data from string to object
					let currentHostedSessions: object | any = _parseData(fetchedCurrentHostedSessions)

					// Start retrieving sessions
					let foundSessions: Array<SessionSearchResult> = []
					Object.keys(currentHostedSessions).forEach((foundSession: string) => {
						// Found X amount of sessions?
						if (maxReturnResults == foundSessions.length){ return; }

						// Filter out the sessions
						// This looks like fucking dogshit but I cant use "continue" in these forEach loops
						if (foundSession.includes(clientToken) == true && currentHostedSessions[foundSession].sessionSettings.isSessionVisible == true){
							let foundSessionData: TurnSession = currentHostedSessions[foundSession]
							let foundSessionCode: string = foundSession.split(":")[1]
							let foundSessionName: string = foundSessionData.sessionSettings.sessionName
							let foundSessionCurrentPlayerCount: number = foundSessionData.peers.length + 1 // Remember: The host is also a player
							let foundSessionMaxPlayerCount: number = foundSessionData.sessionSettings.sessionMaxConnections + 1 // Due to how current player count and max player count is represented, we have to add +1 so that it doesn't seem that A) Servers are empty B) Current player count is more than max. This is just a visual thing
							let foundSessionRequiresPassword: boolean = (foundSessionData.sessionSettings.sessionPassword == "") ? (false):(true)
							foundSessions.push({
								sessionCode: foundSessionCode,
								sessionName: foundSessionName,
								currentPlayerCount: foundSessionCurrentPlayerCount,
								maxPlayerCount: foundSessionMaxPlayerCount,
								requiresPassword: foundSessionRequiresPassword,
							})
						}
					})

					let responseData: ResponseData = {
						responseType: "SERVER",
						responseCode: _responseCodes.CONN_ACKNOWLEDGED,
						responseData: {message: "Success", foundSessions: foundSessions}
					}
					server.send(_stringifyData(responseData), incomingClientConnection.port, incomingClientConnection.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`); return; } })
					return
				})
		})
}

function _joinSessionHandler(incomingClientConnection: IncomingConnection, clientToken: string): void{
	// Retrieve the payload
	let payload: object | any = incomingClientConnection.payload
	let sessionCode: string = payload.sessionCode
	let sessionPassword: string = payload.sessionPassword

	// Check if data was provided
	if (sessionCode == undefined){
		let responseData: ResponseData = {
			responseType: "SERVER",
			responseCode: _responseCodes.CONN_INVALID_BODY,
			responseData: {message: "Invalid body | Missing sessionCode"},
		}
		server.send(_stringifyData(responseData), incomingClientConnection.port, incomingClientConnection.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`); return; } })
		return
	}

	// Fetch current connected clients
	_fetchCachedData(CURRENT_CONNECTED_CLIENTS)
		.catch((error) => {
			err(`joinSessionHandler | Error while fetching data from \"${CURRENT_CONNECTED_CLIENTS}\" cache | ${error}`)
			let responseData: ResponseData = {
				responseType: "SERVER",
				responseCode: _responseCodes.SERVER_INTERNAL_ERROR,
				responseData: {message: "Server error"},
			}
			server.send(_stringifyData(responseData), incomingClientConnection.port, incomingClientConnection.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`); return; } })
			return
		})
		.then((fetchedCurrentConnectedClients: any) => {
			// Log
			log(`joinSessionHandler | Fetched data from \"${CURRENT_CONNECTED_CLIENTS}\" cache`)

			// Convert the data from string to object
			let currentConnectedClients: object | any = _parseData(fetchedCurrentConnectedClients)

			// Check if the remote is registered
			let clientIndex: string = `${incomingClientConnection.address}:${incomingClientConnection.port}`
			if (!Object.hasOwn(currentConnectedClients, clientIndex)){
				let responseData: ResponseData = {
					responseType: "SERVER",
					responseCode: _responseCodes.CONN_NOT_REGISTERED,
					responseData: {message: "You are not registered to use this service"},
				}
				server.send(_stringifyData(responseData), incomingClientConnection.port, incomingClientConnection.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`); return; } })
				return
			}

			// Check if the remote is currently hosting a session or in a session
			let inSession: boolean = currentConnectedClients[clientIndex].sessionData.inSession
			if (inSession){
				let isHosting: boolean = currentConnectedClients[clientIndex].sessionData.isSessionHost
				if (isHosting){
					let responseData: ResponseData = {
						responseType: "SERVER",
						responseCode: _responseCodes.CONN_ALREADY_HOSTING_SESSION,
						responseData: {message: "You are currently hosting a session"},
					}
					server.send(_stringifyData(responseData), incomingClientConnection.port, incomingClientConnection.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`); return; } })
					return
				}else{
					let responseData: ResponseData = {
						responseType: "SERVER",
						responseCode: _responseCodes.CONN_ALREADY_IN_SESSION,
						responseData: {message: "You are already in a session"},
					}
					server.send(_stringifyData(responseData), incomingClientConnection.port, incomingClientConnection.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`); return; } })
					return
				}
			}

			// Fetch current hosted sessions
			_fetchCachedData(CURRENT_HOSTED_SESSIONS)
				.catch((error) => {
					err(`joinSessionHandler | Error while fetching data from \"${CURRENT_HOSTED_SESSIONS}\" cache | ${error}`)
					let responseData: ResponseData = {
						responseType: "SERVER",
						responseCode: _responseCodes.SERVER_INTERNAL_ERROR,
						responseData: {message: "Server error"},
					}
					server.send(_stringifyData(responseData), incomingClientConnection.port, incomingClientConnection.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`); return; } })
					return
				})
				.then((fetchedCurrentHostedSessions: any) => {
					// Log
					log(`joinSessionHandler | Fetched data from \"${CURRENT_HOSTED_SESSIONS}\" cache`)

					// Convert the data from string to object
					let currentHostedSessions: object | any = _parseData(fetchedCurrentHostedSessions)

					// Check if the session exists
					let sessionIndex: string = `${clientToken}:${sessionCode}`
					if (!Object.hasOwn(currentHostedSessions, sessionIndex)){
						let responseData: ResponseData = {
							responseType: "SERVER",
							responseCode: _responseCodes.SESSION_REQUESTED_SESSION_NOT_FOUND,
							responseData: {message: "Session not found"},
						}
						server.send(_stringifyData(responseData), incomingClientConnection.port, incomingClientConnection.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`); return; } })
						return
					}

					// Check if the session is full
					let isSessionFullCheck: boolean = (currentHostedSessions[sessionIndex].sessionSettings.sessionMaxConnections - currentHostedSessions[sessionIndex].peers.length) == 0
					if (isSessionFullCheck){
						let responseData: ResponseData = {
							responseType: "SERVER",
							responseCode: _responseCodes.SESSION_REQUESTED_SESSION_FULL,
							responseData: {message: "Requested session is full"},
						}
						server.send(_stringifyData(responseData), incomingClientConnection.port, incomingClientConnection.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`); return; } })
						return
					}

					// Check if the session requires a password
					let hashedPassword: string = createHash('sha256').update(sessionPassword).digest('base64')
					let isPasswordCorrectCheck: boolean = (hashedPassword == currentHostedSessions[sessionIndex].sessionSettings.sessionPassword)
					if (!isPasswordCorrectCheck){
						let responseData: ResponseData = {
							responseType: "SERVER",
							responseCode: _responseCodes.SESSION_SESSION_PASSWORD_INVALID,
							responseData: {message: "Invalid password"},
						}
						server.send(_stringifyData(responseData), incomingClientConnection.port, incomingClientConnection.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`); return; } })
						return
					}

					// Update the remote
					currentConnectedClients[clientIndex].sessionData.inSession = true
					currentConnectedClients[clientIndex].sessionData.currentSessionCode = sessionCode
					currentConnectedClients[clientIndex].sessionData.currentSessionPeerID = _generateSessionPeerID(clientIndex)

					// Update the session
					currentHostedSessions[sessionIndex].peers.push(currentConnectedClients[clientIndex])

					_writeCacheData(CURRENT_CONNECTED_CLIENTS, _stringifyData(currentConnectedClients))
						.catch((error) => {
							err(`joinSessionHandler | Error while writing data to \"${CURRENT_CONNECTED_CLIENTS}\" cache | ${error}`)
							let responseData: ResponseData = {
								responseType: "SERVER",
								responseCode: _responseCodes.SERVER_INTERNAL_ERROR,
								responseData: {message: "Server error"},
							}
							server.send(_stringifyData(responseData), incomingClientConnection.port, incomingClientConnection.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`); return; } })
							return
						})
						.then(() => {
							_writeCacheData(CURRENT_HOSTED_SESSIONS, _stringifyData(currentHostedSessions))
								.catch((error) => {
									err(`joinSessionHandler | Error while writing data to \"${CURRENT_HOSTED_SESSIONS}\" cache | ${error}`)
									let responseData: ResponseData = {
										responseType: "SERVER",
										responseCode: _responseCodes.SERVER_INTERNAL_ERROR,
										responseData: {message: "Server error"},
									}
									server.send(_stringifyData(responseData), incomingClientConnection.port, incomingClientConnection.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`); return; } })
									return
								})
								.then(() => {
									// Log
									log(`Added peer to session | Notifying other peers`)

									// Prepare to notify the host and peers
									let peerID: string = currentConnectedClients[clientIndex].sessionData.currentSessionPeerID
									let sessionHost: RegisteredClient = currentHostedSessions[sessionIndex].host
									let sessionPeers: Array<RegisteredClient> = currentHostedSessions[sessionIndex].peers
									let notificationData: ResponseData = {
										responseType: "SESSION",
										responseCode: _responseCodes.SESSION_PEER_CONNECTED,
										responseData: {message: "Peer connected", peerID: peerID}
									}

									// Notify the host
									server.send(_stringifyData(notificationData), sessionHost.remoteInfo.port, sessionHost.remoteInfo.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`); return; } })

									// Notify the peers
									sessionPeers.forEach((peer: RegisteredClient) => {
										server.send(_stringifyData(notificationData), peer.remoteInfo.port, peer.remoteInfo.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`); return; } })
									})

									// Log
									log(`Other peers notified`)

									// Send success response
									let responseData: ResponseData = {
										responseType: "SERVER",
										responseCode: _responseCodes.CONN_ACKNOWLEDGED,
										responseData: {message: "Success"},
									}
									server.send(_stringifyData(responseData), incomingClientConnection.port, incomingClientConnection.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`); return; } })
								})
						})
				})
		})
}

function _sendPacketHandler(incomingClientConnection: IncomingConnection, clientToken: string): void{
	// Retrieve the payload
	let payload: object | any = incomingClientConnection.payload
	let packetData: object = payload.packetData
	let receivingPeer: string = payload.receivingPeer

	// Check if data was provided
	if (packetData == undefined){ return; }
	if (receivingPeer == undefined){ receivingPeer = "0" }

	// Fetch current connected clients
	_fetchCachedData(CURRENT_CONNECTED_CLIENTS)
		.catch((error) => {
			err(`sendPacketHandler | Error while fetching data from \"${CURRENT_CONNECTED_CLIENTS}\" cache | ${error}`)
			let responseData: ResponseData = {
				responseType: "SERVER",
				responseCode: _responseCodes.SERVER_INTERNAL_ERROR,
				responseData: {message: "Server error"},
			}
			server.send(_stringifyData(responseData), incomingClientConnection.port, incomingClientConnection.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`); return; } })
			return
		})
		.then((fetchedCurrentConnectedClients: any) => {
			// Log
			log(`sendPacketHandler | Fetched data from \"${CURRENT_CONNECTED_CLIENTS}\" cache`)

			// Convert the data from string to object
			let currentConnectedClients: object | any = _parseData(fetchedCurrentConnectedClients)

			// Check if the remote is registered
			let clientIndex: string = `${incomingClientConnection.address}:${incomingClientConnection.port}`
			if (!Object.hasOwn(currentConnectedClients, clientIndex)){
				let responseData: ResponseData = {
					responseType: "SERVER",
					responseCode: _responseCodes.CONN_NOT_REGISTERED,
					responseData: {message: "You are not registered to use this service"},
				}
				server.send(_stringifyData(responseData), incomingClientConnection.port, incomingClientConnection.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`); return; } })
				return
			}

			// Check if the remote is currently hosting a session or in a session
			let inSession: boolean = currentConnectedClients[clientIndex].sessionData.inSession
			if (!inSession){
				let responseData: ResponseData = {
					responseType: "SERVER",
					responseCode: _responseCodes.SESSION_REQUESTED_SESSION_NOT_FOUND,
					responseData: {message: "You must be in a session in order to send packets"},
				}
				server.send(_stringifyData(responseData), incomingClientConnection.port, incomingClientConnection.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`); return; } })
				return
			}

			// Fetch current hosted sessions
			_fetchCachedData(CURRENT_HOSTED_SESSIONS)
				.catch((error) => {
					err(`sendPacketHandler | Error while fetching data from \"${CURRENT_HOSTED_SESSIONS}\" cache | ${error}`)
					let responseData: ResponseData = {
						responseType: "SERVER",
						responseCode: _responseCodes.SERVER_INTERNAL_ERROR,
						responseData: {message: "Server error"},
					}
					server.send(_stringifyData(responseData), incomingClientConnection.port, incomingClientConnection.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`); return; } })
					return
				})
				.then((fetchedCurrentHostedSessions: any) => {
					// Log
					log(`sendPacketHandler | Fetched data from \"${CURRENT_HOSTED_SESSIONS}\" cache`)

					// Convert the data from string to object
					let currentHostedSessions: object | any = _parseData(fetchedCurrentHostedSessions)

					// Initialize some variables
					let sessionIndex: string = `${clientToken}:${currentConnectedClients[clientIndex].sessionData.currentSessionCode}`
					let sessionHost: RegisteredClient = currentHostedSessions[sessionIndex].host
					let sessionPeers: Array<RegisteredClient> = currentHostedSessions[sessionIndex].peers
					let sendPacket: ResponseData = {
						responseType: "CLIENT",
						responseCode: _responseCodes.CONN_ACKNOWLEDGED,
						responseData: {packet: packetData, peerID: currentConnectedClients[clientIndex].sessionData.currentSessionPeerID},
					}

					// Send to all clients
					if (receivingPeer == "0"){
						// Log
						log(`Sending packet data to all connected peers`)

						// Host
						server.send(_stringifyData(sendPacket), sessionHost.remoteInfo.port, sessionHost.remoteInfo.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`); return; } })

						// Peers
						sessionPeers.forEach((peer: RegisteredClient) => {
							if (peer != currentConnectedClients[clientIndex]){
								server.send(_stringifyData(sendPacket), peer.remoteInfo.port, peer.remoteInfo.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`); return; } })
							}
						})
					}

					// Send to host only
					if (receivingPeer == "1"){
						// Log
						log(`Sending packet data to host`)

						server.send(_stringifyData(sendPacket), sessionHost.remoteInfo.port, sessionHost.remoteInfo.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`); return; } })
					}

					// Check if peer exists
					sessionPeers.forEach((peer: RegisteredClient) => {
						if (peer.sessionData.currentSessionPeerID == receivingPeer){
							// Log
							log(`Sending packet data to specific peer`)
							
							server.send(_stringifyData(sendPacket), peer.remoteInfo.port, peer.remoteInfo.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`); return; } })
						}
					})

					let responseData: ResponseData = {
						responseType: "SERVER",
						responseCode: _responseCodes.CONN_ACKNOWLEDGED,
						responseData: {message: "Success(?)"},
					}
					server.send(_stringifyData(responseData), incomingClientConnection.port, incomingClientConnection.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`); return; } })
					return
				})
		})


}

function _destroySessionHandler(incomingClientConnection: IncomingConnection, clientToken: string): void{
	// Fetch current connected clients
	_fetchCachedData(CURRENT_CONNECTED_CLIENTS)
		.catch((error) => {
			err(`destroySessionHandler | Error while fetching data from \"${CURRENT_CONNECTED_CLIENTS}\" cache | ${error}`)
			let responseData: ResponseData = {
				responseType: "SERVER",
				responseCode: _responseCodes.SERVER_INTERNAL_ERROR,
				responseData: {message: "Server error"},
			}
			server.send(_stringifyData(responseData), incomingClientConnection.port, incomingClientConnection.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`); return; } })
			return
		})
		.then((fetchedCurrentConnectedClients: any) => {
			// Log
			log(`destroySessionHandler | Fetched data from \"${CURRENT_CONNECTED_CLIENTS}\" cache`)

			// Convert the data from string to object
			let currentConnectedClients: object | any = _parseData(fetchedCurrentConnectedClients)

			// Check if the remote is registered
			let clientIndex: string = `${incomingClientConnection.address}:${incomingClientConnection.port}`
			if (!Object.hasOwn(currentConnectedClients, clientIndex)){
				let responseData: ResponseData = {
					responseType: "SERVER",
					responseCode: _responseCodes.CONN_NOT_REGISTERED,
					responseData: {message: "You are not registered to use this service"},
				}
				server.send(_stringifyData(responseData), incomingClientConnection.port, incomingClientConnection.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`); return; } })
				return
			}

			// Check if the remote is currently hosting a session or in a session
			let inSession: boolean = currentConnectedClients[clientIndex].sessionData.inSession
			if (!inSession){
				let responseData: ResponseData = {
					responseType: "SERVER",
					responseCode: _responseCodes.SESSION_REQUESTED_SESSION_NOT_FOUND,
					responseData: {message: "You must be in a session in order to destroy one"},
				}
				server.send(_stringifyData(responseData), incomingClientConnection.port, incomingClientConnection.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`); return; } })
				return
			}

			// Fetch current hosted sessions
			_fetchCachedData(CURRENT_HOSTED_SESSIONS)
				.catch((error) => {
					err(`destroySessionHandler | Error while fetching data from \"${CURRENT_HOSTED_SESSIONS}\" cache | ${error}`)
					let responseData: ResponseData = {
						responseType: "SERVER",
						responseCode: _responseCodes.SERVER_INTERNAL_ERROR,
						responseData: {message: "Server error"},
					}
					server.send(_stringifyData(responseData), incomingClientConnection.port, incomingClientConnection.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`); return; } })
					return
				})
				.then((fetchedCurrentHostedSessions: any) => {
					// Log
					log(`joinSessionHandler | Fetched data from \"${CURRENT_HOSTED_SESSIONS}\" cache`)

					// Convert the data from string to object
					let currentHostedSessions: object | any = _parseData(fetchedCurrentHostedSessions)

					// Fetch the current session the remote is in and if they are a host
					let currentSessionCode: string = currentConnectedClients[clientIndex].sessionData.currentSessionCode
					let isSessionHost: boolean = currentConnectedClients[clientIndex].sessionData.isSessionHost
					let sessionIndex: string = `${clientToken}:${currentSessionCode}`

					// Remote is the host, destroy the session
					if (isSessionHost == true){
						// Log
						log(`Attempting to destroy a session`)

						// Notify all peers and update their information
						let sessionPeers: Array<RegisteredClient> = currentHostedSessions[sessionIndex].peers
						sessionPeers.forEach((sessionPeer: RegisteredClient) => {
							let sessionPeerIndex: string = `${sessionPeer.remoteInfo.address}:${sessionPeer.remoteInfo.port}`
							let notificationData: ResponseData = {
								responseType: "SESSION",
								responseCode: _responseCodes.SESSION_SESSION_DESTROYED,
								responseData: {message: "Session destroyed by host"}
							}
							
							// Update peer info
							currentConnectedClients[sessionPeerIndex].sessionData.inSession = false
							currentConnectedClients[sessionPeerIndex].sessionData.currentSessionCode = ""
							currentConnectedClients[sessionPeerIndex].sessionData.currentSessionPeerID = ""

							// Send notification
							server.send(_stringifyData(notificationData), sessionPeer.remoteInfo.port, sessionPeer.remoteInfo.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`); return; } })
						})

						// Update the remote
						currentConnectedClients[clientIndex].sessionData.inSession = false
						currentConnectedClients[clientIndex].sessionData.isSessionHost = false
						currentConnectedClients[clientIndex].sessionData.currentSessionCode = ""
						currentConnectedClients[clientIndex].sessionData.currentSessionPeerID = ""

						// Destroy the session
						delete currentHostedSessions[sessionIndex]

						// Log
						log(`Session destroyed`)
					}

					// Remote is a peer, remove them from the session
					if (isSessionHost == false){
						// Log
						log(`Attempting to remove peer from session`)

						// Initialize some data
						let peerID: string = currentConnectedClients[clientIndex].sessionData.currentSessionPeerID
						let notificationData: ResponseData = {
							responseType: "SESSION",
							responseCode: _responseCodes.SESSION_PEER_DISCONNECTED,
							responseData: {message: "Peer disconnect", peerID: peerID}
						}

						// Notify host
						let sessionHost: RegisteredClient = currentHostedSessions[sessionIndex].Host
						server.send(_stringifyData(notificationData), sessionHost.remoteInfo.port, sessionHost.remoteInfo.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`); return; } })
						
						// Notify peers
						let sessionPeers: Array<RegisteredClient> = currentHostedSessions[sessionIndex].peers
						sessionPeers.forEach((sessionPeer: RegisteredClient) => {
							if (sessionPeer != currentConnectedClients[clientIndex]){
								server.send(_stringifyData(notificationData), sessionPeer.remoteInfo.port, sessionPeer.remoteInfo.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`); return; } })
							}
						})

						// Update the remote
						currentConnectedClients[clientIndex].sessionData.inSession = false
						currentConnectedClients[clientIndex].sessionData.currentSessionCode = ""
						currentConnectedClients[clientIndex].sessionData.currentSessionPeerID = ""

						// Log
						log(`Peer removed from session`)
					}

					// Write data
					// NOTE: If this errors out then the peer would still be in the session
					_writeCacheData(CURRENT_CONNECTED_CLIENTS, _stringifyData(currentConnectedClients))
						.catch((error) => {
							err(`destroySessionHandler | Error while writing data to \"${CURRENT_CONNECTED_CLIENTS}\" cache | ${error}`)
							let responseData: ResponseData = {
								responseType: "SERVER",
								responseCode: _responseCodes.SERVER_INTERNAL_ERROR,
								responseData: {message: "Server error"},
							}
							server.send(_stringifyData(responseData), incomingClientConnection.port, incomingClientConnection.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`); return; } })
							return
						})
						.then(() => {
							_writeCacheData(CURRENT_HOSTED_SESSIONS, _stringifyData(currentHostedSessions))
								.catch((error) => {
									err(`destroySessionHandler | Error while writing data to \"${CURRENT_HOSTED_SESSIONS}\" cache | ${error}`)
									let responseData: ResponseData = {
										responseType: "SERVER",
										responseCode: _responseCodes.SERVER_INTERNAL_ERROR,
										responseData: {message: "Server error"},
									}
									server.send(_stringifyData(responseData), incomingClientConnection.port, incomingClientConnection.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`); return; } })
									return
								})
								.then(() => {
									let responseData: ResponseData = {
										responseType: "SERVER",
										responseCode: _responseCodes.CONN_ACKNOWLEDGED,
										responseData: {message: "Success"},
									}
									server.send(_stringifyData(responseData), incomingClientConnection.port, incomingClientConnection.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`); return; } })
									return
								})
						})
				})
		})
}

function _clientHeartbeatHandler(incomingClientConnection: IncomingConnection): void{			
	// Check if incoming client heartbeat was in the list of previous connected clients
	let newClientIndex: string = `${incomingClientConnection.address}:${incomingClientConnection.port}`
	if (Object.hasOwn(_pastConnectedClients, newClientIndex)){
		delete _pastConnectedClients[newClientIndex]
	}
}

function _serverHeartbeat(): void{
	// Fetch current connected clients
	_fetchCachedData(CURRENT_CONNECTED_CLIENTS)
		.catch((error) => {
			err(`serverHeartbeat | Error while fetching data from \"${CURRENT_CONNECTED_CLIENTS}\" cache | ${error}`)
			return
		})
		.then((fetchedCurrentConnectedClients: any) => {
			// Log
			log(`serverHeartbeat | Fetched data from \"${CURRENT_CONNECTED_CLIENTS}\" cache`)

			// Convert the data from string to object
			let currentConnectedClients: object | any = _parseData(fetchedCurrentConnectedClients)

			// Fetch current hosted sessions
			_fetchCachedData(CURRENT_HOSTED_SESSIONS)
				.catch((error) => {
					err(`serverHeartbeat | Error while fetching data from \"${CURRENT_HOSTED_SESSIONS}\" cache | ${error}`)
					return
				})
				.then((fetchedCurrentHostedSessions: any) => {
					// Log
					log(`serverHeartbeat | Fetched data from \"${CURRENT_HOSTED_SESSIONS}\" cache`)

					// Convert the data from string to object
					let currentHostedSessions: object | any = _parseData(fetchedCurrentHostedSessions)

					// Setup data
					Object.keys(_pastConnectedClients).forEach((pastClientIndex: string) => {
						// Was the past client in a session?
						let wasInSession: boolean = _pastConnectedClients[pastClientIndex].sessionData.inSession
						if (wasInSession){
							let wasSessionHost: boolean = _pastConnectedClients[pastClientIndex].sessionData.isSessionHost
							let sessionIndex: string = `${_pastConnectedClients[pastClientIndex].clientToken}:${_pastConnectedClients[pastClientIndex].sessionData.currentSessionCode}`

							if (wasSessionHost == true){
								// Fetch session data
								let sessionPeers: Array<RegisteredClient> = currentHostedSessions[sessionIndex].peers
								let sessionDestroyedNotification: ResponseData = {
									responseType: "SESSION",
									responseCode: _responseCodes.SESSION_SESSION_DESTROYED,
									responseData: {message: "Session destroyed by host"},
								}

								// Announce session is destroyed and update the affected clients
								sessionPeers.forEach((client: RegisteredClient) => {
									let sessionClientIndex: string = `${client.remoteInfo.address}:${client.remoteInfo.port}`

									// Update client
									currentConnectedClients[sessionClientIndex].sessionData.inSession = false
									currentConnectedClients[sessionClientIndex].sessionData.currentSessionCode = ""
									currentConnectedClients[sessionClientIndex].sessionData.currentSessionPeerID = ""

									// Send notification
									server.send(_stringifyData(sessionDestroyedNotification), client.remoteInfo.port, client.remoteInfo.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`); return; } })
								})

								// Destroy the session
								delete currentHostedSessions[sessionIndex]
							}

							if (wasSessionHost == false){
								// Fetch session data
								let sessionHost: RegisteredClient = currentHostedSessions[sessionIndex].host
								let sessionPeers: Array<RegisteredClient> = currentHostedSessions[sessionIndex].peers
								let pastClientPeerID: string = currentConnectedClients[pastClientIndex].sessionData.currentSessionPeerID
								let peerDisconnectedNotification: ResponseData = {
									responseType: "SESSION",
									responseCode: _responseCodes.SESSION_PEER_DISCONNECTED,
									responseData: {message: "Peer disconnected", peerID: pastClientPeerID},
								}

								// Remove peer from peer array
								let index: number = sessionPeers.indexOf(_pastConnectedClients[pastClientIndex])
								sessionPeers.splice(index, 1)

								// Announce peer left
								server.send(_stringifyData(peerDisconnectedNotification), sessionHost.remoteInfo.port, sessionHost.remoteInfo.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`); return; } })
								
								sessionPeers.forEach((client: RegisteredClient) => {
									server.send(_stringifyData(peerDisconnectedNotification), client.remoteInfo.port, client.remoteInfo.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`); return; } })
								})
							}
						}

						// Remove past client from connected clients array
						delete currentConnectedClients[pastClientIndex]
					})

					// Set past clients equal to current clients
					_pastConnectedClients = currentConnectedClients

					// Write data
					_writeCacheData(CURRENT_CONNECTED_CLIENTS, _stringifyData(currentConnectedClients))
						.catch((error) => {
							err(`serverHeartbeat | Error while writing data to \"${CURRENT_CONNECTED_CLIENTS}\" cache | ${error}`)
							return
						})
						.then(() => {
							_writeCacheData(CURRENT_HOSTED_SESSIONS, _stringifyData(currentHostedSessions))
								.catch((error) => {
									err(`serverHeartbeat | Error while writing data to \"${CURRENT_HOSTED_SESSIONS}\" cache | ${error}`)
									return
								})
								.then(() => {
									// Send out a heartbeat
									let registeredClientArray: Array<RegisteredClient> = Object.values(currentConnectedClients)
									let heartbeatData: ResponseData = {
										responseType: "HEARTBEAT",
										responseCode: _responseCodes.SERVER_HEARTBEAT,
										responseData: {message: "Server heartbeat"},
									}

									registeredClientArray.forEach((client: RegisteredClient) => {
										server.send(_stringifyData(heartbeatData), client.remoteInfo.port, client.remoteInfo.address, (error) => { if (error){ err(`Error while sending response to client | ${error}`); return; } })
									})

									log(`Server heartbeat sent!`)
								})
						})
				})
		})
}

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

/**
 * Stringifies data with `JSON.stringify`
 * @param { any } data - The data to stringify 
 * @returns { string } StringifiedData
 */
function _stringifyData(data: any): string{
	return JSON.stringify(data)
}

/**
 * Converts a JSON string into a TS/JS object
 * @param { any } data - The data to parse
 * @returns { any } Object
 */
function _parseData(data: any): object{
	return JSON.parse(data)
}

/**
 * Generates a session code `(99.9% chance of not being a repeat)`
 * @returns { string } The generated session code
 */
function _generateSessionCode(): string{
	return randomBytes(8).toString('hex')
}

/**
 * Generates a session peer ID
 * @param { string } clientIndex - The client index
 * @returns { string } Generated session peer ID
 */
function _generateSessionPeerID(clientIndex: string): string{
	return Buffer.from(randomBytes(2).toString('base64') + clientIndex + randomBytes(2).toString('base64')).toString('base64')
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