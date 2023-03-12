// Imports
import express from 'express'
import { Collection, Db, MongoClient } from 'mongodb'
import { objectNullCheck } from '../../../../shared/general-utility-module/src/general_utility_module'
import { err, log, wrn } from '../../../../shared/logging-module/src/logging_module'

// Docstring
/**
 * Loopware Online Subsystem @ Datastore Endpoint || Robust endpoint that allows for reading/writing
 * to a MongoDB instance
 */

// Enums

// Interface
interface DatabaseInteraction {
	collectionName: string,
	fetchQuery: {
		query: object,
		projection: object
	},
	writeData: object
}

// Constants
const router = express.Router()
const datastoreStorageAgent: MongoClient = new MongoClient(String(process.env.DS_MONGO_DATASTORE_STORAGE_URI))

// ENV Constants

// Public Variables

// Private Variables
var _connectedToDatastoreStorageDB: boolean = true

// _init()
async function _init(): Promise<any> {
	// Connect to Datastore Storage
	try {
		await datastoreStorageAgent.connect()
		log(`Connection to Mongo@DatastoreStorage was successful`)
		_connectedToDatastoreStorageDB = true
	}catch (error){
		wrn(`Connection to Mongo@DatastoreStorage was unsuccessful | ${error}`)
		_connectedToDatastoreStorageDB= false
	}
}

// Public Methods | In Order of CRUD(Create, Read, Update, Destroy)
router.post("/new-collection", (req, res) => {
	// Retrieve data
	let incomingData: object | any = req.body
	let userData: object | any = req.res?.locals.authorizedUserData

	// Check if we received an empty body
	if (Object.keys(incomingData).length === 0){ res.status(400).json({code: 400, message: "Empty body"}); return; }

	// Store data
	let newCollectionData: DatabaseInteraction = {
		collectionName: `${userData.clientToken}-${incomingData.collectionName}`,
		fetchQuery: {query: {}, projection: {}},
		writeData: incomingData.writeData
	}

	// Null checks
	if (objectNullCheck(newCollectionData)){ res.status(400).json({code: 400, message: "Invalid body"}); return; }

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
				if (Object.keys(newCollectionData.writeData).length === 0){
					log(`Successfully created collection \"${newCollection.collectionName}\"`)
					res.status(200).json({code: 200, message: "Success"})
					return
				}

				// There is optional data to write
				newCollection.insertOne(newCollectionData.writeData)
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
		err(`Fatal error occurred on "/new-collection" endpoint | ${error}`)
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
	let newWriteData: DatabaseInteraction = {
		collectionName: `${userData.clientToken}-${incomingData.collectionName}`,
		fetchQuery: {query: {}, projection: {}},
		writeData: incomingData.writeData
	}

	// Null checks
	if (objectNullCheck(newWriteData)){ res.status(400).json({code: 400, message: "Invalid body"}); return; }

	// Check connection to database
	if (!_connectedToDatastoreStorageDB){ res.status(500).json({code: 500, message: "Database Offline"}); return; }

	// Try to write data to collection
	try{
		let datastoreStorageDatabase: Db = datastoreStorageAgent.db()
		let datastoreStorageCollection: Collection = datastoreStorageDatabase.collection(newWriteData.collectionName)

		// Write data
		datastoreStorageCollection.insertOne(newWriteData.writeData)
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
	let newFetchData: DatabaseInteraction = {
		collectionName: `${userData.clientToken}-${incomingData.collectionName}`,
		fetchQuery: {query: incomingData.fetchQuery.query, projection: incomingData.fetchQuery.projection},
		writeData: {}
	}

	// Null checks
	if(objectNullCheck(newFetchData)){ res.status(400).json({code: 400, message: "Invalid body"}); return; }

	// Check connection to database
	if (!_connectedToDatastoreStorageDB){ res.status(500).json({code: 500, message: "Database Offline"}); return; }

	// Attempt to fetch data from collection
	try{
		let datastoreStorageDatabase: Db = datastoreStorageAgent.db()
		let datastoreStorageCollection: Collection = datastoreStorageDatabase.collection(newFetchData.collectionName)

		// Fetch data
		datastoreStorageCollection.findOne(newFetchData.fetchQuery.query, {projection: newFetchData.fetchQuery.projection})
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
	let newUpdateData: DatabaseInteraction = {
		collectionName: `${userData.clientToken}-${incomingData.collectionName}`,
		fetchQuery: {query: incomingData.fetchQuery.query, projection: {}},
		writeData: incomingData.writeData
	}

	// Null checks
	if (objectNullCheck(newUpdateData)){ res.status(400).json({code: 400, message: "Invalid body"}); return; }

	// Check connection to database
	if (!_connectedToDatastoreStorageDB){ res.status(500).json({code: 500, message: "Database Offline"}); return; }

	// Try to update data in collection
	try{
		let datastoreStorageDatabase: Db = datastoreStorageAgent.db()
		let datastoreStorageCollection: Collection = datastoreStorageDatabase.collection(newUpdateData.collectionName)

		// Update data
		datastoreStorageCollection.updateOne(newUpdateData.fetchQuery.query, {"$set": newUpdateData.writeData})
			.catch((error) => {
				err(`Database error while updating data in [${datastoreStorageCollection.collectionName}@${datastoreStorageDatabase.databaseName}] | ${error}`)
				res.status(500).json({code: 500, message: "Database error"})
				return
			})
			.then((result) => {
				if (!result){ res.status(404).json({code: 404, message: "Document not found | No changes were made"}); return; }
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
	let newReplacementData: DatabaseInteraction = {
		collectionName: `${userData.clientToken}-${incomingData.collectionName}`,
		fetchQuery: {query: incomingData.fetchQuery.query, projection: {}},
		writeData: incomingData.writeData
	}

	// Null checks
	if (objectNullCheck(newReplacementData)){ res.status(400).json({code: 400, message: "Invalid body"}); return; }

	// Check connection to database
	if (!_connectedToDatastoreStorageDB){ res.status(500).json({code: 500, message: "Database Offline"}); return; }

	// Try to replace data in collection
	try{
		let datastoreStorageDatabase: Db = datastoreStorageAgent.db()
		let datastoreStorageCollection: Collection = datastoreStorageDatabase.collection(newReplacementData.collectionName)

		// Replace data
		datastoreStorageCollection.replaceOne(newReplacementData.fetchQuery.query, newReplacementData.writeData)
			.catch((error) => {
				err(`Database error while updating data in [Mongo@${datastoreStorageDatabase.databaseName}] | ${error}`)
				res.status(500).json({code: 500, message: "Database error"})
				return
			})
			.then((result) => {
				if (!result){ res.status(404).json({code: 404, message: "Document not found | No changes were made"}); return; }
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

router.delete("/delete-data", (req, res) => {
	// Retrieve data
	let incomingData: object | any = req.body
	let userData: object | any = req.res?.locals.authorizedUserData

	// Check if we received an empty body
	if (Object.keys(incomingData).length === 0){ res.status(400).json({code: 400, message: "Empty body"}); return; }

	// Store data
	let newDeleteData: DatabaseInteraction = {
		collectionName: `${userData.clientToken}-${incomingData.collectionName}`,
		fetchQuery: {query: incomingData.fetchQuery.query, projection: {}},
		writeData: {}
	}

	// Null checks
	if (objectNullCheck(newDeleteData)){ res.status(400).json({code: 400, message: "Invalid body"}); return; }

	// Check connection to database
	if (!_connectedToDatastoreStorageDB){ res.status(500).json({code: 500, message: "Database Offline"}); return; }

	// Attempt to delete data from collection
	try{
		let datastoreStorageDatabase: Db = datastoreStorageAgent.db()
		let datastoreStorageCollection: Collection = datastoreStorageDatabase.collection(newDeleteData.collectionName)

		datastoreStorageCollection.deleteOne(newDeleteData.fetchQuery.query)
			.catch((error) => {
				err(`Database error while trying to delete data from [${datastoreStorageCollection.collectionName}@${datastoreStorageDatabase.databaseName}] | ${error}`)
				res.status(500).json({code: 500, message: "Database error"})
				return
			})
			.then((result) => {
				if (!result){ res.status(404).json({code: 404, message: "Document not found | No changes were made"}); return; }
				log(`Successfully deleted data from [${datastoreStorageCollection.collectionName}@${datastoreStorageDatabase.databaseName}]`)
				res.status(200).json({code: 200, message: "Success"})
				return
			})

	}catch (error){
		err(`Fatal error occurred on "/delete-data" endpoint | ${error}`)
		res.status(500).json({code: 500, message: "Fatal error"})
		return
	}
})

router.delete("/delete-data-bulk", (req, res) => {
	res.status(501).json({code: 501, message: "TBI | Please use /delete-data instead"})
	return
})

router.delete("/delete-collection", (req, res) => {
	// Retrieve data
	let incomingData: object | any = req.body
	let userData: object | any = req.res?.locals.authorizedUserData

	// Check if we received an empty body
	if (Object.keys(incomingData).length === 0){ res.status(400).json({code: 400, message: "Empty body"}); return; }

	// Store data
	let newDeleteCollectionData: DatabaseInteraction = {
		collectionName: `${userData.clientToken}-${incomingData.collectionName}`,
		fetchQuery: {query: {}, projection: {}},
		writeData: {}
	}

	// Null checks
	if (objectNullCheck(newDeleteCollectionData)){ res.status(400).json({code: 400, message: "Invalid body"}); return; }

	// Check connection to database
	if (!_connectedToDatastoreStorageDB){ res.status(500).json({code: 500, message: "Database Offline"}); return; }

	// Try to delete collection
	try{
		let datastoreStorageDatabase: Db = datastoreStorageAgent.db()

		datastoreStorageDatabase.dropCollection(newDeleteCollectionData.collectionName)
			.catch((error) => {
				err(`Database error while deleting collection \"${newDeleteCollectionData.collectionName}\" from \"${datastoreStorageDatabase.databaseName}\" | ${error}`)
				res.status(500).json({code: 500, message: "Database error"})
				return
			})
			.then(() => {
				log(`Successfully deleted collection \"${newDeleteCollectionData.collectionName}\" from \"${datastoreStorageDatabase.databaseName}\"`)
				res.status(200).json({code: 200, message: "Success"})
				return
			})

	}catch (error){
		err(`Fatal error occurred on "/delete-collection" endpoint | ${error}`)
		res.status(500).json({code: 500, message: "Fatal error"})
		return
	}
})

// Private Methods
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

_init()
module.exports = router