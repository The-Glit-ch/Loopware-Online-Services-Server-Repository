// Imports
import express from 'express'
import { Collection, Db, MongoClient } from 'mongodb'
import { err, log, wrn } from '../../../../shared/logging-module/src/logging_module'

// Docstring
/**
 * Loopware Online Subsystem @ Datastore Endpoint || Robust endpoint that allows for reading/writing
 * to a MongoDB instance
 */

// Enums

// Interface
interface genericFetchQuery {
	collectionName: string,
	fetchQuery: object,
	fetchProjection: object
}

interface genericDatabaseInteraction{
	collectionName: string,
	data: object
}

// Constants
const router = express.Router()
const datastoreStorageAgent: MongoClient = new MongoClient(String(process.env.DS_MONGO_DATASTORE_STORAGE_URI))

// ENV Constants

// Public Variables

// Private Variables
var _connectedToDatastoreStorageDB: boolean = true

// _init()

// Public Methods | In Order of CRUD(Create, Read, Update, Destroy)
router.post("/new-collection", (req, res) => {
	// Retrieve data
	let incomingData: object | any = req.body
	let userData: object | any = req.res?.locals.authorizedUserData

	// Check if we received an empty body
	if (Object.keys(incomingData).length === 0){ res.status(400).json({code: 400, message: "Empty body"}); return; }

	// Store data
	let newCollectionData: genericDatabaseInteraction = {
		collectionName: `${userData.appName}-${incomingData.collectionName}`,
		data: incomingData.data
	}

	// Null checks
	if (_objectNullCheck(newCollectionData)){ res.status(400).json({code: 400, message: "Invalid body"}); return; }

	// Check connection to database
	if (!_connectedToDatastoreStorageDB){ res.status(500).json({code: 500, message: "Database Offline"}); return; }

	// Attempt to create new collection and write data
	try{
		let datastoreStorageDatabase: Db = datastoreStorageAgent.db()
		
		// TODO: Check for duplicate collection

		// Create collection
		datastoreStorageDatabase.createCollection(newCollectionData.collectionName)
			.catch((error) => {
				err(`Database error while creating a new collection in [Mongo@${datastoreStorageDatabase.databaseName}] | ${error}`)
				res.status(500).json({code: 500, message: "Database error"})
				return
			})
			.then((newCollection) => {
				// Resolve still returns a void value even when it errors out
				if (!newCollection){ return; }

				// No optional data to write
				if (!newCollectionData.data){
					log(`Successfully created collection \"${newCollection.collectionName}\"`)
					res.status(200).json({code: 200, message: "Success"})
					return;
				}

				// There is optional data to write
				newCollection.insertOne(newCollectionData.data)
					.catch((error) => {
						err(`Database error while writing data to [${newCollection.collectionName}@${datastoreStorageDatabase.databaseName}] | ${error}`)
						res.status(409).json({code: 409, message: "Collection successfully made | Error writing data"})
						return
					})
					.then(() => {
						log(`Successfully wrote data to [${newCollection.collectionName}@${datastoreStorageDatabase.databaseName}]`)
						res.status(200).json({code: 200, message: "Success"})
						return
					})
			})
	}catch (error){
		err(`Fatal error occurred on "/create-new-collection" endpoint | ${error}`)
		res.status(500).json({code: 500, message: "Fatal error"})
		return
	}

})

router.post("/write-data", (req, res) => {
	// Retrieve data
	let incomingData: object | any = req.body
	let userData: object | any = req.res?.locals.authorizedUserData

	// Check if we received an empty body
	if (Object.keys(incomingData).length === 0){ res.status(400).json({code: 400, message: "Empty body"}); return; }

	// Store data
	let writeData: genericDatabaseInteraction = {
		collectionName: `${userData.appName}-${incomingData.collectionName}`,
		data: incomingData.data
	}

	// Null checks
	if (_objectNullCheck(writeData)){ res.status(400).json({code: 400, message: "Invalid body"}); return; }

	// Check connection to database
	if (!_connectedToDatastoreStorageDB){ res.status(500).json({code: 500, message: "Database Offline"}); return; }

	// Try to write data to collection
	try{
		let datastoreStorageDatabase: Db = datastoreStorageAgent.db()
		let datastoreStorageCollection: Collection = datastoreStorageDatabase.collection(writeData.collectionName)

		// Write data
		datastoreStorageCollection.insertOne(writeData.data)
			.catch((error) => {
				err(`Database error while writing data to [${datastoreStorageCollection.collectionName}@${datastoreStorageDatabase.databaseName}] | ${error}`)
				res.status(500).json({code: 500, message: "Database error"})
				return
			})
			.then(() => {
				log(`Successfully wrote data to [${datastoreStorageCollection.collectionName}@${datastoreStorageDatabase.databaseName}]`)
				res.status(200).json({code: 200, message: "Success"})
				return
			})
	}catch (error){
		err(`Fatal error occurred on "/write-data" endpoint | ${error}`)
		res.status(500).json({code: 500, message: "Fatal error"})
		return
	}

})

router.post("/write-data-bulk", (req, res) => {
	res.status(501).json({code: 501, message: "TBI | Please use /write-data instead"})
	return
})

router.get("/fetch-data", (req, res) => {
	// Retrieve data
	let incomingData: object | any = req.body
	let userData: object | any = req.res?.locals.authorizedUserData

	// Check if we received an empty body
	if (Object.keys(incomingData).length === 0){ res.status(400).json({code: 400, message: "Empty body"}); return; }

	// Store data
	let fetchData: genericFetchQuery = {
		collectionName: `${userData.appName}-${incomingData.collectionName}`,
		fetchQuery: incomingData.fetchQuery,
		fetchProjection: incomingData.fetchProjection
	}

	// Null checks
	if(_objectNullCheck(fetchData)){ res.status(400).json({code: 400, message: "Invalid body"}); return; }

	// Check connection to database
	if (!_connectedToDatastoreStorageDB){ res.status(500).json({code: 500, message: "Database Offline"}); return; }

	// Attempt to fetch data from collection
	try{
		let datastoreStorageDatabase: Db = datastoreStorageAgent.db()
		let datastoreStorageCollection: Collection = datastoreStorageDatabase.collection(fetchData.collectionName)

		// Fetch data
		datastoreStorageCollection.findOne(fetchData.fetchQuery, {projection: fetchData.fetchProjection})
			.catch((error) => {
				err(`Database error while fetching data from [Mongo@${datastoreStorageDatabase.databaseName}] | ${error}`)
				res.status(500).json({code: 500, message: "Database error"})
				return
			})
			.then((foundData) => {
				if (!foundData){ res.status(404).json({code: 404, message: "Nothing found"}); return; }
				log(`Successfully fetched data from [${datastoreStorageCollection.collectionName}@${datastoreStorageDatabase.databaseName}]`)

				res.status(200).json({code: 200, message: "Success", data: foundData})
				return
			})

	}catch (error){
		err(`Fatal error occurred on "/fetch-data" endpoint | ${error}`)
		res.status(500).json({code: 500, message: "Fatal error"})
		return
	}
})

router.patch("/update-data", (req, res) => {
	// Retrieve data
	let incomingData: object | any = req.body
	let userData: object | any = req.res?.locals.authorizedUserData

	// Check if we received an empty body
	if (Object.keys(incomingData).length === 0){ res.status(400).json({code: 400, message: "Empty body"}); return; }
	
	// Store data
	let updateData: genericDatabaseInteraction = {
		collectionName: `${userData.appName}-${incomingData.collectionName}`,
		data: incomingData.data
	}
	let updateQuery: genericFetchQuery = {
		collectionName: "",
		fetchQuery: incomingData.fetchQuery,
		fetchProjection: {}
	}

	// Null checks
	if (_objectNullCheck(updateData) || _objectNullCheck(updateQuery)){ res.status(400).json({code: 400, message: "Invalid body"}); return; }

	// Check connection to database
	if (!_connectedToDatastoreStorageDB){ res.status(500).json({code: 500, message: "Database Offline"}); return; }

	// Try to update data in collection
	try{
		let datastoreStorageDatabase: Db = datastoreStorageAgent.db()
		let datastoreStorageCollection: Collection = datastoreStorageDatabase.collection(updateData.collectionName)

		// Update data
		datastoreStorageCollection.updateOne(updateQuery.fetchQuery, {"$set": updateData.data})
			.catch((error) => {
				err(`Database error while updating data in [${datastoreStorageCollection.collectionName}@${datastoreStorageDatabase.databaseName}] | ${error}`)
				res.status(500).json({code: 500, message: "Database error"})
				return
			})
			.then(() => {
				log(`Successfully updated data in [${datastoreStorageCollection.collectionName}@${datastoreStorageDatabase.databaseName}]`)
				res.status(200).json({code: 200, message: "Success"})
				return
			})

	}catch (error){
		err(`Fatal error occurred on "/update-data" endpoint | ${error}`)
		res.status(500).json({code: 500, message: "Fatal error"})
		return
	}
})

router.patch("/update-data-bulk", (req, res) => {
	res.status(501).json({code: 501, message: "TBI | Please use /update-data instead"})
	return
})

router.put("/replace-data", (req, res) => {
	// Retrieve data
	let incomingData: object | any = req.body
	let userData: object | any = req.res?.locals.authorizedUserData

	// Check if we received an empty body
	if (Object.keys(incomingData).length === 0){ res.status(400).json({code: 400, message: "Empty body"}); return; }
	
	// Store data
	let replacementData: genericDatabaseInteraction = {
		collectionName: `${userData.appName}-${incomingData.collectionName}`,
		data: incomingData.data
	}

	let replacementQuery: genericFetchQuery = {
		collectionName: "",
		fetchQuery: incomingData.fetchQuery,
		fetchProjection: {}
	}

	// Null checks
	if (_objectNullCheck(replacementData) || _objectNullCheck(replacementQuery)){ res.status(400).json({code: 400, message: "Invalid body"}); return; }

	// Check connection to database
	if (!_connectedToDatastoreStorageDB){ res.status(500).json({code: 500, message: "Database Offline"}); return; }

	// Try to replace data in collection
	try{
		let datastoreStorageDatabase: Db = datastoreStorageAgent.db()
		let datastoreStorageCollection: Collection = datastoreStorageDatabase.collection(replacementData.collectionName)

		// Replace data
		datastoreStorageCollection.replaceOne(replacementQuery.fetchQuery, replacementData.data)
			.catch((error) => {
				err(`Database error while updating data in [Mongo@${datastoreStorageDatabase.databaseName}] | ${error}`)
				res.status(500).json({code: 500, message: "Database error"})
				return
			})
			.then(() => {
				log(`Successfully updated data in [Mongo@${datastoreStorageDatabase.databaseName}]`)
				res.status(200).json({code: 200, message: "Success"})
				return
			})

	}catch (error){
		err(`Fatal error occurred on "/replace-data" endpoint | ${error}`)
		res.status(500).json({code: 500, message: "Fatal error"})
		return
	}
})


// Private Methods
/**
 * Checks if an object has an undefined key or value. Returns `true`
 * if `undefined` is found
 * @param { object } object - The object to check
 * @returns boolean
 */
function _objectNullCheck(object: object): boolean{
	Object.entries(object).forEach(([key, value]) => {
		if (key == undefined || value == undefined){ return true }
	})
	
	return false
}

function _retryConnection(): void{
	let count: number = 0
	let interval: NodeJS.Timer = setInterval(async () => { log(`Retrying...(${count})`); count++; await datastoreStorageAgent.connect(); }, 2000)
	datastoreStorageAgent.on('serverHeartbeatSucceeded', () => { clearInterval(interval) })
}

// Run
datastoreStorageAgent.on('serverHeartbeatSucceeded', () => {
	if (!_connectedToDatastoreStorageDB){ log(`Reconnected to MongoDB@DatastoreStorage`); _connectedToDatastoreStorageDB = true; }
})

datastoreStorageAgent.on('serverHeartbeatFailed', () => {
	wrn(`Connection to Mongo@DatastoreStorage was dropped | Attempting reconnection`)
	if(_connectedToDatastoreStorageDB == true){ _retryConnection() }
	_connectedToDatastoreStorageDB = false
})


module.exports = router