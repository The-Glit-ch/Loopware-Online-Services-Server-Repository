// Imports
import { err, log, wrn } from '../../../../shared/logging-module/src/logging_module'
import { objectNullCheck } from '../../../../shared/general-utility-module/src/general_utility_module'
import express, { Router } from 'express'
import { Collection, Db, MongoClient } from 'mongodb'

// Docstring
/**
 * Loopware Online Subsystem @ Leaderboard Endpoint || Provides an easy to use solution for creating, reading,
 * updating, and deleting custom leaderboards
 */

// Enums

// Interface
interface LeaderboardInteraction {
	leaderboardName: string,
	leaderboardCategory: string,
	leaderboardRecordIndex: string,
	leaderboardRecordData: object,
}

interface LeaderboardCategoryObject {
	categoryName: string,
	categoryRecords: object,
}

// Constants
const router: Router = express.Router()
const leaderboardStorageAgent: MongoClient = new MongoClient(String(process.env.DATASTORE_MONGO_LEADERBOARD_STORAGE_URI))

// ENV Constants

// Public Variables

// Private Variables
var _connectedToLeaderboardStorageDB: boolean = true

// _init()
async function _init(): Promise<void> {
	// Connect to Leaderboard Storage
	try {
		await leaderboardStorageAgent.connect()
		log(`Connection to Mongo@LeaderboardStorage was successful`)
		_connectedToLeaderboardStorageDB = true
	} catch (error) {
		wrn(`Connection to Mongo@LeaderboardStorage was unsuccessful | ${error}`)
		_connectedToLeaderboardStorageDB = false
	}
}

// Public Methods | In Order of CRUD(Create, Read, Update, Destroy)
router.post("/new-leaderboard", (req, res) => {
	// Retrieve data
	let incomingData: object | any = req.body
	let userData: object | any = req.res?.locals.authorizedUserData

	// Check if we received an empty body
	if (Object.keys(incomingData).length === 0) { res.status(400).json({ code: 400, message: "Empty body" }); return; }

	// Store data
	let newLeaderboardData: LeaderboardInteraction = {
		leaderboardName: `${userData.clientToken}-${incomingData.leaderboardName}`,
		leaderboardCategory: "",
		leaderboardRecordIndex: "",
		leaderboardRecordData: {},
	}

	// Null checks
	if (objectNullCheck(newLeaderboardData)) { res.status(400).json({ code: 400, message: "Invalid body" }); return; }

	// Check connection to database
	if (!_connectedToLeaderboardStorageDB) { res.status(500).json({ code: 500, message: "Database Offline" }); return; }

	// Attempt to create a new leaderboard
	try {
		let leaderboardStorageDatabase: Db = leaderboardStorageAgent.db()

		// TODO: Check for duplicate leaderboard

		// Create new leaderboard
		leaderboardStorageDatabase.createCollection(newLeaderboardData.leaderboardName)
			.catch((error) => {
				err(`Database error while creating a new collection in [Mongo@${leaderboardStorageDatabase.databaseName}] | ${error}`)
				res.status(500).json({ code: 500, message: "Database error" })
				return
			})
			.then((newLeaderboard) => {
				// Resolve still returns a void value even when it errors out
				if (!newLeaderboard) { return; }

				log(`Successfully created leaderboard \"${newLeaderboardData.leaderboardName}\"`)
				res.status(200).json({ code: 200, message: "Success" })
				return
			})
	} catch (error) {
		err(`Fatal error occurred on "/new-leaderboard" endpoint | ${error}`)
		res.status(500).json({ code: 500, message: "Fatal error" })
		return
	}
})

router.post("/new-category", (req, res) => {
	// Retrieve data
	let incomingData: object | any = req.body
	let userData: object | any = req.res?.locals.authorizedUserData

	// Check if we received an empty body
	if (Object.keys(incomingData).length === 0) { res.status(400).json({ code: 400, message: "Empty body" }); return; }

	// Store data
	let newLeaderboardCategoryData: LeaderboardInteraction = {
		leaderboardName: `${userData.clientToken}-${incomingData.leaderboardName}`,
		leaderboardCategory: incomingData.leaderboardCategory,
		leaderboardRecordIndex: "",
		leaderboardRecordData: {},
	}

	// Null checks
	if (objectNullCheck(newLeaderboardCategoryData)) { res.status(400).json({ code: 400, message: "Invalid body" }); return; }

	// Check connection to database
	if (!_connectedToLeaderboardStorageDB) { res.status(500).json({ code: 500, message: "Database Offline" }); return; }

	// Attempt to create a new leaderboard category
	try {
		let leaderboardStorageDatabase: Db = leaderboardStorageAgent.db()
		let leaderboardStorageLeaderboard: Collection = leaderboardStorageDatabase.collection(newLeaderboardCategoryData.leaderboardName)
		let newCategoryPayload: LeaderboardCategoryObject = {
			categoryName: newLeaderboardCategoryData.leaderboardCategory,
			categoryRecords: {},
		}

		// TODO: Check if leaderboard exists, although adding this really has no impact on mitigating errors
		// like "db.collection()" already makes a new collection if the specified collection does not exists

		// Create a new category
		leaderboardStorageLeaderboard.insertOne(newCategoryPayload)
			.catch((error) => {
				err(`Database error while writing data to [${leaderboardStorageLeaderboard.collectionName}@${leaderboardStorageDatabase.databaseName}] | ${error}`)
				res.status(500).json({ code: 500, message: "Database error" })
				return
			})
			.then(() => {
				log(`Successfully wrote data to [${leaderboardStorageLeaderboard.collectionName}@${leaderboardStorageDatabase.databaseName}]`)
				res.status(200).json({ code: 200, message: "Success" })
				return
			})
	} catch (error) {
		err(`Fatal error occurred on "/new-category" endpoint | ${error}`)
		res.status(500).json({ code: 500, message: "Fatal error" })
		return
	}
})

router.post("/add-record", (req, res) => {
	// Retrieve data
	let incomingData: object | any = req.body
	let userData: object | any = req.res?.locals.authorizedUserData

	// Check if we received an empty body
	if (Object.keys(incomingData).length === 0) { res.status(400).json({ code: 400, message: "Empty body" }); return; }

	// Store data
	let newLeaderboardRecordData: LeaderboardInteraction = {
		leaderboardName: `${userData.clientToken}-${incomingData.leaderboardName}`,
		leaderboardCategory: incomingData.leaderboardCategory,
		leaderboardRecordIndex: incomingData.leaderboardRecordIndex,
		leaderboardRecordData: incomingData.leaderboardRecordData,
	}

	// Null checks
	if (objectNullCheck(newLeaderboardRecordData)) { res.status(400).json({ code: 400, message: "Invalid body" }); return; }

	// Check connection to database
	if (!_connectedToLeaderboardStorageDB) { res.status(500).json({ code: 500, message: "Database Offline" }); return; }

	// Attempt to add a new leaderboard record
	try {
		let leaderboardStorageDatabase: Db = leaderboardStorageAgent.db()
		let leaderboardStorageLeaderboard: Collection = leaderboardStorageDatabase.collection(newLeaderboardRecordData.leaderboardName)
		let leaderboardCategorySearchQuery: object = { categoryName: newLeaderboardRecordData.leaderboardCategory }
		let leaderboardCategorySearchQueryOptions: object = { projection: { categoryRecords: 1 } }

		// Check if the category exists and fetch the data
		leaderboardStorageLeaderboard.findOne(leaderboardCategorySearchQuery, leaderboardCategorySearchQueryOptions)
			.catch((error) => {
				err(`Database error while fetching data from [${leaderboardStorageLeaderboard.collectionName}@${leaderboardStorageDatabase.databaseName}] | ${error}`)
				res.status(500).json({ code: 500, message: "Database error" })
				return
			})
			.then((foundCategoryDocument) => {
				// Category not found
				if (!foundCategoryDocument) { res.status(404).json({ code: 404, message: "Category not found" }); return; }

				// Get the records object
				let recordsObject: object | any = foundCategoryDocument.categoryRecords

				// Add a new record
				recordsObject[newLeaderboardRecordData.leaderboardRecordIndex] = newLeaderboardRecordData.leaderboardRecordData

				// Write data
				leaderboardStorageLeaderboard.updateOne(leaderboardCategorySearchQuery, { "$set": { "categoryRecords": recordsObject } })
					.catch((error) => {
						err(`Database error while writing data to [${leaderboardStorageLeaderboard.collectionName}@${leaderboardStorageDatabase.databaseName}] | ${error}`)
						res.status(500).json({ code: 500, message: "Database error" })
						return
					})
					.then(() => {
						log(`Successfully wrote data to [${leaderboardStorageLeaderboard.collectionName}@${leaderboardStorageDatabase.databaseName}]`)
						res.status(200).json({ code: 200, message: "Success" })
						return
					})
			})
	} catch (error) {
		err(`Fatal error occurred on "/add-record" endpoint | ${error}`)
		res.status(500).json({ code: 500, message: "Fatal error" })
		return
	}
})

router.get("/fetch-records", (req, res) => {
	// Retrieve data
	let incomingData: object | any = req.body
	let userData: object | any = req.res?.locals.authorizedUserData

	// Check if we received an empty body
	if (Object.keys(incomingData).length === 0) { res.status(400).json({ code: 400, message: "Empty body" }); return; }

	// Store data
	let newLeaderboardFetchRecordsData: LeaderboardInteraction = {
		leaderboardName: `${userData.clientToken}-${incomingData.leaderboardName}`,
		leaderboardCategory: incomingData.leaderboardCategory,
		leaderboardRecordIndex: "",
		leaderboardRecordData: {},
	}

	// Null checks
	if (objectNullCheck(newLeaderboardFetchRecordsData)) { res.status(400).json({ code: 400, message: "Invalid body" }); return; }

	// Check connection to database
	if (!_connectedToLeaderboardStorageDB) { res.status(500).json({ code: 500, message: "Database Offline" }); return; }

	// Attempt to fetch record data from category
	try {
		let leaderboardStorageDatabase: Db = leaderboardStorageAgent.db()
		let leaderboardStorageLeaderboard: Collection = leaderboardStorageDatabase.collection(newLeaderboardFetchRecordsData.leaderboardName)
		let leaderboardCategorySearchQuery: object = { categoryName: newLeaderboardFetchRecordsData.leaderboardCategory }
		let leaderboardCategorySearchQueryOptions: object = { projection: { categoryRecords: 1, _id: 0 } }

		// Check if the category exists and fetch the data
		leaderboardStorageLeaderboard.findOne(leaderboardCategorySearchQuery, leaderboardCategorySearchQueryOptions)
			.catch((error) => {
				err(`Database error while fetching data from [${leaderboardStorageLeaderboard.collectionName}@${leaderboardStorageDatabase.databaseName}] | ${error}`)
				res.status(500).json({ code: 500, message: "Database error" })
				return
			})
			.then((foundCategoryDocument) => {
				// Category not found
				if (!foundCategoryDocument) { res.status(404).json({ code: 404, message: "Category not found" }); return; }

				// Return record data
				log(`Successfully fetched data from [${leaderboardStorageLeaderboard.collectionName}@${leaderboardStorageDatabase.databaseName}]`)
				res.status(200).json({ code: 200, message: "Success", data: foundCategoryDocument })
				return
			})
	} catch (error) {
		err(`Fatal error occurred on "/fetch-records" endpoint | ${error}`)
		res.status(500).json({ code: 500, message: "Fatal error" })
		return
	}
})

router.patch("/update-record", (req, res) => {
	// Basically the same as "add-record"

	// Retrieve data
	let incomingData: object | any = req.body
	let userData: object | any = req.res?.locals.authorizedUserData

	// Check if we received an empty body
	if (Object.keys(incomingData).length === 0) { res.status(400).json({ code: 400, message: "Empty body" }); return; }

	// Store data
	let newLeaderboardUpdateRecordData: LeaderboardInteraction = {
		leaderboardName: `${userData.clientToken}-${incomingData.leaderboardName}`,
		leaderboardCategory: incomingData.leaderboardCategory,
		leaderboardRecordIndex: incomingData.leaderboardRecordIndex,
		leaderboardRecordData: incomingData.leaderboardRecordData,
	}

	// Null checks
	if (objectNullCheck(newLeaderboardUpdateRecordData)) { res.status(400).json({ code: 400, message: "Invalid body" }); return; }

	// Check connection to database
	if (!_connectedToLeaderboardStorageDB) { res.status(500).json({ code: 500, message: "Database Offline" }); return; }

	// Attempt to update the leaderboard record
	try {
		let leaderboardStorageDatabase: Db = leaderboardStorageAgent.db()
		let leaderboardStorageLeaderboard: Collection = leaderboardStorageDatabase.collection(newLeaderboardUpdateRecordData.leaderboardName)
		let leaderboardCategorySearchQuery: object = { categoryName: newLeaderboardUpdateRecordData.leaderboardCategory }
		let leaderboardCategorySearchQueryOptions: object = { projection: { categoryRecords: 1 } }

		// Check if the category exists and fetch the data
		leaderboardStorageLeaderboard.findOne(leaderboardCategorySearchQuery, leaderboardCategorySearchQueryOptions)
			.catch((error) => {
				err(`Database error while fetching data from [${leaderboardStorageLeaderboard.collectionName}@${leaderboardStorageDatabase.databaseName}] | ${error}`)
				res.status(500).json({ code: 500, message: "Database error" })
				return
			})
			.then((foundCategoryDocument) => {
				// Category not found
				if (!foundCategoryDocument) { res.status(404).json({ code: 404, message: "Category not found" }); return; }

				// Get the records object
				let recordsObject: object | any = foundCategoryDocument.categoryRecords

				// Add a new record
				recordsObject[newLeaderboardUpdateRecordData.leaderboardRecordIndex] = newLeaderboardUpdateRecordData.leaderboardRecordData

				// Write data
				leaderboardStorageLeaderboard.updateOne(leaderboardCategorySearchQuery, { "$set": { "categoryRecords": recordsObject } })
					.catch((error) => {
						err(`Database error while writing data to [${leaderboardStorageLeaderboard.collectionName}@${leaderboardStorageDatabase.databaseName}] | ${error}`)
						res.status(500).json({ code: 500, message: "Database error" })
						return
					})
					.then(() => {
						log(`Successfully wrote data to [${leaderboardStorageLeaderboard.collectionName}@${leaderboardStorageDatabase.databaseName}]`)
						res.status(200).json({ code: 200, message: "Success" })
						return
					})
			})
	} catch (error) {
		err(`Fatal error occurred on "/update-record" endpoint | ${error}`)
		res.status(500).json({ code: 500, message: "Fatal error" })
		return
	}
})

router.delete("/delete-record", (req, res) => {
	res.status(501).json({ code: 501, message: "TBI" })
	return
})

router.delete("/delete-category", (req, res) => {
	// Retrieve data
	let incomingData: object | any = req.body
	let userData: object | any = req.res?.locals.authorizedUserData

	// Check if we received an empty body
	if (Object.keys(incomingData).length === 0) { res.status(400).json({ code: 400, message: "Empty body" }); return; }

	// Store data
	let newDeleteLeaderboardCategoryData: LeaderboardInteraction = {
		leaderboardName: `${userData.clientToken}-${incomingData.leaderboardName}`,
		leaderboardCategory: incomingData.leaderboardCategory,
		leaderboardRecordIndex: "",
		leaderboardRecordData: {},
	}

	// Null checks
	if (objectNullCheck(newDeleteLeaderboardCategoryData)) { res.status(400).json({ code: 400, message: "Invalid body" }); return; }

	// Check connection to database
	if (!_connectedToLeaderboardStorageDB) { res.status(500).json({ code: 500, message: "Database Offline" }); return; }

	// Attempt to delete a leaderboard category
	try {
		let leaderboardStorageDatabase: Db = leaderboardStorageAgent.db()
		let leaderboardStorageLeaderboard: Collection = leaderboardStorageDatabase.collection(newDeleteLeaderboardCategoryData.leaderboardName)
		let leaderboardCategorySearchQuery: object = { categoryName: newDeleteLeaderboardCategoryData.leaderboardCategory }

		leaderboardStorageLeaderboard.deleteOne(leaderboardCategorySearchQuery)
			.catch((error) => {
				err(`Database error while deleting data from [${leaderboardStorageLeaderboard.collectionName}@${leaderboardStorageDatabase.databaseName}] | ${error}`)
				res.status(500).json({ code: 500, message: "Database error" })
				return
			})
			.then((isDeleted) => {
				if (!isDeleted) { res.status(404).json({ code: 404, message: "Category not found" }); return; }

				log(`Successfully deleted data from [${leaderboardStorageLeaderboard.collectionName}@${leaderboardStorageDatabase.databaseName}]`)
				res.status(200).json({ code: 200, message: "Success" })
				return
			})
	} catch (error) {
		err(`Fatal error occurred on "/delete-category" endpoint | ${error}`)
		res.status(500).json({ code: 500, message: "Fatal error" })
		return
	}
})

router.delete("/delete-leaderboard", (req, res) => {
	// Retrieve data
	let incomingData: object | any = req.body
	let userData: object | any = req.res?.locals.authorizedUserData

	// Check if we received an empty body
	if (Object.keys(incomingData).length === 0) { res.status(400).json({ code: 400, message: "Empty body" }); return; }

	// Store data
	let newDeleteLeaderboardData: LeaderboardInteraction = {
		leaderboardName: `${userData.clientToken}-${incomingData.leaderboardName}`,
		leaderboardCategory: "",
		leaderboardRecordIndex: "",
		leaderboardRecordData: {},
	}

	// Null checks
	if (objectNullCheck(newDeleteLeaderboardData)) { res.status(400).json({ code: 400, message: "Invalid body" }); return; }

	// Check connection to database
	if (!_connectedToLeaderboardStorageDB) { res.status(500).json({ code: 500, message: "Database Offline" }); return; }

	// Attempt to delete leaderboard
	try {
		let leaderboardStorageDatabase: Db = leaderboardStorageAgent.db()

		leaderboardStorageDatabase.dropCollection(newDeleteLeaderboardData.leaderboardName)
			.catch((error) => {
				err(`Database error deleting [Mongo@${leaderboardStorageDatabase.databaseName}] | ${error}`)
				res.status(500).json({ code: 500, message: "Database error" })
				return
			})
			.then((wasDropped) => {
				if (!wasDropped) { res.status(404).json({ code: 404, message: "Leaderboard not found" }); return; }

				log(`Successfully deleted [Mongo@${leaderboardStorageDatabase.databaseName}]`)
				res.status(200).json({ code: 200, message: "Success" })
				return
			})
	} catch (error) {
		err(`Fatal error occurred on "/delete-leaderboard" endpoint | ${error}`)
		res.status(500).json({ code: 500, message: "Fatal error" })
		return
	}
})

// Private Methods
function _retryConnection(client: MongoClient): void {
	let count: number = 0
	let interval: NodeJS.Timer = setInterval(async () => { log(`Retrying...(${count})`); count++; await client.connect(); }, 2000)
	client.on('serverHeartbeatSucceeded', () => { clearInterval(interval) })
}

// Run
leaderboardStorageAgent.on('serverHeartbeatSucceeded', () => {
	if (!_connectedToLeaderboardStorageDB) { log(`Reconnected to MongoDB@LeaderboardStorage`); _connectedToLeaderboardStorageDB = true; }
})

leaderboardStorageAgent.on('serverHeartbeatFailed', () => {
	wrn(`Connection to MongoDB@LeaderboardStorage was dropped | Attempting reconnection`)
	if (_connectedToLeaderboardStorageDB == true) { _retryConnection(leaderboardStorageAgent) }
	_connectedToLeaderboardStorageDB = false
})

_init()
module.exports = router