// Imports
import dgram from 'dgram'
import { join } from 'path'
import { config } from 'dotenv'
import { err, log, wrn } from '../../../../shared/logging-module/src/logging_module'
import { RedisClientType, createClient } from '@redis/client'
let _environmentLoadingError: Error | undefined = config({path: join(process.cwd(), './.env/.lossConfig.env')}).error
// Docstring
/**
 * 
 */

// Enums

// Interface

// Constants
const server = dgram.createSocket('udp6')
const redisCache: RedisClientType = createClient({socket: {
	host: '127.0.0.1',
	port: 36212
}})

// ENV Constants
const PORT: number = Number(process.env.UDPPH_LISTEN_PORT)

// Public Variables

// Private Variables
var _responseCodes: Object = { }

// _init()
function _init(): void{
	// Sanity Checks
	if (_environmentLoadingError != undefined){ wrn(`.ENV file was not successfully loaded | ${_environmentLoadingError.message}`) }
}

// Public Methods
server.on('message', (message: Buffer, remoteInfo: dgram.RemoteInfo) => {
	// Decode the incoming JSON data
	let decodedMessage: Object | any = JSON.parse(message.toString())

	// Authorization middleware

	// Match request to "route"
	switch (decodedMessage.connectionType){
		case "createClient": {
			_newClientHandle(decodedMessage, remoteInfo)
		}
	}
})

// Private Methods
function fetchCachedData(key: string): Promise<any>{
	return new Promise((resolve, reject) => {
		redisCache.get(key)
			.then((returnData) => {
				resolve(returnData)
			})
			.catch((error) => {
				reject(error)
			})
	})
}

function _newClientHandle(message: Object | any, remoteInfo: dgram.RemoteInfo): void{
	// Get list of already connected clients
	fetchCachedData('connectedClients')
		.then((returnList) => {
			// Check if client is in the list
			console.log()
		})
		.catch((error) => {
			err(`Error while fetching data from cache | ${error}`)
		})

	return 
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

_init()
server.bind(PORT)