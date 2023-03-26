// Imports
import { log, wrn, err } from '../../../../../shared/logging-module/src/logging_module'
import { destringifyData, stringifyData } from '../../../../../shared/general-utility-module/src/general_utility_module'
import express, { Router } from 'express'
import { createClient, RedisClientType } from 'redis'

// Docstring
/**
 * Loopware Online Subsystem @ Analytics Endpoint || Handles all data coming in and out of the analytics system
 */

// Enums

// Interface
interface AnalyticsInteraction {
	analyticalTimestamp: {
		exact: string,
		minute: string,
	},
	analyticalService: string,
	analyticalData: object | any,
}

// Constants
const router: Router = express.Router()
const analyticsStorageAgent: RedisClientType = createClient({ socket: { host: String(process.env.ANALYTICS_REDIS_DATABASE_HOST), port: Number(process.env.ANALYTICS_REDIS_DATABASE_PORT), } })

// ENV Constants

// Public Variables

// Private Variables

// _init()
async function _init(): Promise<void> {
	// Connect to Analytics Storage
	await analyticsStorageAgent.connect()
}

// Public Methods
router.post("/write-data", (req, res) => {
	// Retrieve data
	let incomingData: object | any = req.body

	// Check if we received an empty body
	if (Object.keys(incomingData).length === 0) { res.status(400).json({ code: 400, message: "Empty body" }); return; }

	// Store data
	let newAnalyticalData: AnalyticsInteraction = {
		analyticalTimestamp: {
			// Fun fact: Under the right conditions "exact" will not always be equal to "minute" and vice versa...I'm not changing this
			exact: _generateAnalyticalTimestamp(true),
			minute: _generateAnalyticalTimestamp(),
		},
		analyticalService: incomingData.analyticalService,
		analyticalData: incomingData.analyticalData
	}

	// Prepare blobs
	let analyticalTallyBlob: string = `${newAnalyticalData.analyticalTimestamp.minute}-count`
	let analyticalDataBlob: string = `${newAnalyticalData.analyticalTimestamp.minute}-data`

	// Fetch the count
	_fetchData(analyticalTallyBlob)
		.catch((error) => {
			err(`analyticalTallyBlob | Error while fetching data from \"${analyticalTallyBlob}\" blob | ${error}`)
			res.status(500).json({ code: 500, message: "Server error" })
			return
		})
		.then((fetchedAnalyticalTallyBlob: any) => {
			// Log
			log(`analyticalTallyBlob | Fetched data from \"${analyticalTallyBlob}\" blob`)

			// Convert the data from JSON string to object
			let currentAnalyticalTallyBlob: object | any = (!fetchedAnalyticalTallyBlob) ? ({}) : (destringifyData(fetchedAnalyticalTallyBlob))

			// Fetch the data
			_fetchData(analyticalDataBlob)
				.catch((error) => {
					err(`analyticalDataBlob | Error while fetching data from \"${analyticalDataBlob}\" blob | ${error}`)
					res.status(500).json({ code: 500, message: "Server error" })
					return
				})
				.then((fetchedAnalyticalDataBlob) => {
					// Log
					log(`analyticalDataBlob | Fetched data from \"${analyticalDataBlob}\" blob`)

					// Convert the data from JSON string to object
					let currentAnalyticalDataBlob: Array<AnalyticsInteraction> = (!fetchedAnalyticalDataBlob) ? ([]) : (destringifyData(fetchedAnalyticalDataBlob))

					// Update the combined tally
					if (!currentAnalyticalTallyBlob['_totalCount']) {
						currentAnalyticalTallyBlob['_totalCount'] = 1
					} else {
						currentAnalyticalTallyBlob['_totalCount'] += 1
					}

					// Update the sub-tally
					if (!currentAnalyticalTallyBlob[newAnalyticalData.analyticalService]) {
						currentAnalyticalTallyBlob[newAnalyticalData.analyticalService] = 1
					} else {
						currentAnalyticalTallyBlob[newAnalyticalData.analyticalService] += 1
					}

					// Update the data blob
					currentAnalyticalDataBlob.push(newAnalyticalData)

					// Write data - Updating the data blob first
					_writeData(analyticalDataBlob, stringifyData(currentAnalyticalDataBlob))
						.catch((error) => {
							err(`analyticalDataBlob | Error while writing data to \"${analyticalDataBlob}\" blob | ${error}`)
							res.status(500).json({ code: 500, message: "Server error" })
							return
						})
						.then(() => {
							// Log
							log(`analyticalDataBlob | Wrote data to \"${analyticalDataBlob}\" blob`)

							_writeData(analyticalTallyBlob, stringifyData(currentAnalyticalTallyBlob))
								.catch((error) => {
									err(`analyticalTallyBlob | Error while writing data to \"${analyticalTallyBlob}\" blob | ${error}`)
									res.status(500).json({ code: 500, message: "Server error" })
									return
								})
								.then(() => {
									// Log
									log(`analyticalTallyBlob | Wrote data to \"${analyticalTallyBlob}\" blob`)
									log(`Successfully wrote analytical data`)

									res.status(200).json({ code: 200, message: "Success" })
									return
								})
						})
				})
		})
})

// Private Methods
/**
 * Generates a formatted analytical timestamp
 * @param { boolean } exact - Should it include seconds? | Default: False
 * @returns { string } The new timestamp
 */
function _generateAnalyticalTimestamp(exact: boolean = false): string {
	// Retrieve time data and format it
	let currentDate: Date = new Date
	let currentDateString: string = currentDate.toLocaleDateString('eu').replaceAll("/", "-")
	let currentTimeString: string = currentDate.toLocaleTimeString('eu').replaceAll(":", "-")

	// Remove the seconds
	if (!exact) { currentTimeString = currentTimeString.slice(0, -3) }

	// Return
	return `${currentDateString}_${currentTimeString}`
}

/**
 * Writes data to the database
 * @param { string } key - The key value 
 * @param { string } data - The data value 
 * @returns { Promise<any> } - Promise 
 */
function _writeData(key: string, data: string): Promise<any> {
	return new Promise((resolve, reject) => {
		analyticsStorageAgent.set(key, data)
			.catch((error) => {
				reject(error)
			})
			.then((returnData) => {
				resolve(returnData)
			})
	})
}

/**
 * Fetches data from the database
 * @param { string } key - The key value 
 * @returns { Promise<any> } Promise
 */
function _fetchData(key: string): Promise<any> {
	return new Promise((resolve, reject) => {
		analyticsStorageAgent.get(key)
			.catch((error) => {
				reject(error)
			})
			.then((returnData) => {
				resolve(returnData)
			})
	})
}

// Run
analyticsStorageAgent.on('error', (error) => {
	err(`Redis error | ${error}`)
})

analyticsStorageAgent.on('ready', () => {
	log(`Redis database connected`)
})

analyticsStorageAgent.on('reconnecting', () => {
	wrn(`Redis database connection was dropped | Attempting reconnection`)
})

_init()
module.exports = router