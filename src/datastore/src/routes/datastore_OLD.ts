// Imports
import express from 'express'
import { Collection, Db, MongoClient } from 'mongodb'
import { log, err, wrn } from '../../../../shared/logging-module/src/logging_module'

// Docstring
/**
 * Loopware Online Subsystem @ /datastore Endpoint || Simple and generic endpoint that allows
 * for writing/reading to a MongoDB database
 */

// Enums

// Interface
// TODO: Proper Implement sort and projection and possible re-implementation
interface fetchQueryOptions {
	fetchQuery: object
	fetchSort: object
	fetchProjection: object
}

interface incomingData {
	collectionName: string
	collectionData: object
}

// Constants
const router = express.Router()
const mongoClient: MongoClient = new MongoClient(String(process.env.MONGO_DATASTORE_URI))

// Public Variables

// Private Variables
var _connectedToDB: boolean = true

// _init()
async function _init():Promise<void> {
	// Connect to Mongo Instance
	try{
		await mongoClient.connect()
		log(`Connection to MongoDB@Datastore was successful`)
		_connectedToDB = true
	}catch (error){
		wrn(`Connection to MongoDB@Datastore was unsuccessful | ${error}`)
		_connectedToDB = false
	}	
}

// Public Methods | In order of CRUD
router.post("/new-collection", async (req, res) => {
	// Retrieve new collection data
	let dataBody: any | object = req.body

	// Payload empty?
	if (Object.keys(dataBody).length === 0){ res.status(400).json({code: 400, message: "Empty request"}); return; }

	// Store data
	let data: incomingData = {collectionName: dataBody.cName, collectionData: dataBody.cData}

	// Check connection
	if (!_connectedToDB){ res.status(500).json({code: 500, message: "Database Offline"}); return; }

	// Make collection + optionally write data
	try{
		let currentDatabase: Db = mongoClient.db()
		currentDatabase.createCollection(data.collectionName)
			.catch((_error) => { res.status(409).json({code: 409, message: "Collection already made"}); return; })
			.then((newCollection) => {
				// Apparently even when it errors it still calls the resolve method...Wack
				if (!newCollection){ return; }
				if (!data.collectionData){ res.status(200).json({code: 200, message: "Success"}); return; }
				currentDatabase.collection(data.collectionName).insertOne(data.collectionData)
					.catch((error) => {
						err(`Internal Server Error while writing data to [${data.collectionName}@Datastore] | ${error}`)
						res.status(500).json({code: 500, message: "Error writing data"})
						return
					})
					.then(() => {
						log(`Successfully wrote data to [${data.collectionName}@Datastore]`)
						res.status(200).json({code: 200, message: "Success"})
						return
					})
			})
	}catch (error){
		err(`Fatal error occurred on "/new-collection" endpoint | ${error}`)
		res.status(400).json({code: 400, message: "Invalid request body"})
		return
	}
})

router.post("/write-data", async (req, res) => {
	// Retrieve new write data
	let dataBody: any | object = req.body

	// Payload empty?
	if (Object.keys(dataBody).length === 0){ res.status(400).json({code: 400, message: "Empty request"}); return; }

	// Store data
	let data: incomingData = {collectionName: dataBody.cName, collectionData: dataBody.cData}

	// Check connection
	if (!_connectedToDB){ res.status(500).json({code: 500, message: "Database Offline"}); return; }

	// Write data to collection
	try{
		let currentDatabase: Db = mongoClient.db()
		let currentCollection: Collection = currentDatabase.collection(data.collectionName)
		currentCollection.insertOne(data.collectionData)
			.catch((error) => {
				err(`Internal Server Error while writing data to [${data.collectionName}@Datastore] | ${error}`)
				res.status(500).json({code: 500, message: "Error writing data"})
				return
			})
			.then(() => {
				log(`Successfully wrote data to [${data.collectionName}@Datastore]`)
				res.status(200).json({code: 200, message: "Success"})
				return
			})
	}catch (error){
		err(`Fatal error occurred on "/write-data" endpoint | ${error}`)
		res.status(400).json({code: 400, message: "Invalid request body"})
		return
	}
})

router.post("/write-data-bulk", (req, res) => {
	res.status(501).json({code: 501, message: "TBI"})
	return
})

router.get("/fetch-data", async (req, res) => {
	// Retrieve data
	let dataBody: any | object = req.body

	// Payload empty?
	if (Object.keys(dataBody).length === 0){ res.status(400).json({code: 400, message: "Empty request"}); return; }

	// Store data
	let data: incomingData = {
		collectionName: dataBody.cName, 
		collectionData: {}}
	
	// TODO: Check #Interface
	let fetchOptions: fetchQueryOptions = {
		fetchQuery: dataBody.cFetchOptions?.fetchQuery || {},
		fetchSort: dataBody.cFetchOptions?.fetchSort || {},
		fetchProjection: dataBody.cFetchOptions?.fetchProject || {}
	}

	// Check connection
	if (!_connectedToDB){ res.status(500).json({code: 500, message: "Database Offline"}); return; }

	// Fetch data from collection
	try{
		let currentDatabase: Db = mongoClient.db()
		let currentCollection: Collection = currentDatabase.collection(data.collectionName)
		currentCollection.findOne(fetchOptions.fetchQuery, {projection: {"_id": 0}})
			.catch((error) => {
				err(`Internal Server Error while fetching data from [${data.collectionName}@Datastore] | ${error}`)
				res.status(500).json({code: 500, message: "Error fetching data"})
				return
			})
			.then((foundDocument) => {
				if (!foundDocument) { return; }
				log(`Successfully fetched data from [${data.collectionName}@Datastore]`)
				res.status(200).json({code: 200, message: "Success", data: foundDocument})
				return
			})
	}catch (error){
		err(`Fatal error occurred on "/fetch-data" endpoint | ${error}`)
		res.status(400).json({code: 400, message: "Invalid request body"})
		return
	}
})

router.patch("/update-data", (req, res) => {
	// Retrieve new update data
	let dataBody: any | object = req.body

	// Payload empty?
	if (Object.keys(dataBody).length === 0){ res.status(400).json({code: 400, message: "Empty request"}); return; }

	// Store data
	let data: incomingData = {
		collectionName: dataBody.cName,
		collectionData: dataBody.cData
	}

	let fetchOptions: fetchQueryOptions = {
		fetchQuery: dataBody.cFetchOptions.fetchQuery,
		fetchSort: {},
		fetchProjection: {}
	}

	// Check connection
	if (!_connectedToDB){ res.status(500).json({code: 500, message: "Database Offline"}); return; }

	// Update data in collection
	try{
		let currentDatabase: Db = mongoClient.db()
		let currentCollection: Collection = currentDatabase.collection(data.collectionName)
		currentCollection.updateOne(fetchOptions.fetchQuery, {"$set": data.collectionData}, {upsert: false})
			.catch((error) => {
				err(`Internal Server Error while updating data from [${data.collectionName}@Datastore] | ${error}`)
				res.status(500).json({code: 500, message: "Error updating data"})
				return
			})
			.then(() => {
				log(`Successfully updated data on [${data.collectionName}@Datastore]`)
				res.status(200).json({code: 200, message: "Success"})
				return
			})
	}catch(error){
		err(`Fatal error occurred on "/update-data" endpoint | ${error}`)
		res.status(400).json({code: 400, message: "Invalid request body"})
		return
	}
})

router.patch("/update-data-bulk", (req, res) => {
	res.status(501).json({code: 501, message: "TBI"})
	return
})

router.put("/replace-data", (req, res) => {
	// Retrieve new replacement data
	let dataBody: any | object = req.body

	// Payload empty?
	if (Object.keys(dataBody).length === 0){ res.status(400).json({code: 400, message: "Empty request"}); return; }

	// Store data
	let data: incomingData = {
		collectionName: dataBody.cName,
		collectionData: dataBody.cData
	}

	let fetchOptions: fetchQueryOptions = {
		fetchQuery: dataBody.cFetchOptions.fetchQuery,
		fetchSort: {},
		fetchProjection: {}
	}

	// Check connection
	if (!_connectedToDB){ res.status(500).json({code: 500, message: "Database Offline"}); return; }

	// Replace data in collection
	try{
		let currentDatabase: Db = mongoClient.db()
		let currentCollection: Collection = currentDatabase.collection(data.collectionName)
		currentCollection.replaceOne(fetchOptions.fetchQuery, data.collectionData)
			.catch((error) => {
				err(`Internal Server Error while replacing data from [${data.collectionName}@Datastore] | ${error}`)
				res.status(500).json({code: 500, message: "Error replacing data"})
				return
			})
			.then(() => {
				log(`Successfully replaced data on [${data.collectionName}@Datastore]`)
				res.status(200).json({code: 200, message: "Success"})
				return
			})
	}catch (error){
		err(`Fatal error occurred on "/replace-data" endpoint | ${error}`)
		res.status(400).json({code: 400, message: "Invalid request body"})
		return
	}

})

router.delete("/delete-data", (req, res) => {
	// Retrieve delete data
	let dataBody: any | object = req.body

	// Payload empty?
	if (Object.keys(dataBody).length === 0){ res.status(400).json({code: 400, message: "Empty request"}); return; }

	// Store data
	let data: incomingData = {
		collectionName: dataBody.cName,
		collectionData: {}
	}

	let fetchOptions: fetchQueryOptions = {
		fetchQuery: dataBody.cFetchOptions.fetchQuery,
		fetchSort: {},
		fetchProjection: {}
	}

	// Check connection
	if (!_connectedToDB){ res.status(500).json({code: 500, message: "Database Offline"}); return; }

	// Delete data in collection
	try{
		let currentDatabase: Db = mongoClient.db()
		let currentCollection: Collection = currentDatabase.collection(data.collectionName)
		currentCollection.deleteOne(fetchOptions.fetchQuery)
			.catch((error) => {
				err(`Internal Server Error while replacing data from [${data.collectionName}@Datastore] | ${error}`)
				res.status(500).json({code: 500, message: "Error replacing data"})
				return
			})
			.then(() => {
				log(`Successfully replaced data on [${data.collectionName}@Datastore]`)
				res.status(200).json({code: 200, message: "Success"})
				return
			})
	}catch (error){
		err(`Fatal error occurred on "/delete-data" endpoint | ${error}`)
		res.status(400).json({code: 400, message: "Invalid request body"})
		return
	}
})

router.delete("/delete-collection", (req, res) => {
	// Retrieve collection delete data
	let dataBody: any | object = req.body

	// Payload empty?
	if (Object.keys(dataBody).length === 0){ res.status(400).json({code: 400, message: "Empty request"}); return; }

	// Store data
	let data: incomingData = {
		collectionName: dataBody.cName,
		collectionData: {}
	}

	// Check connection
	if (!_connectedToDB){ res.status(500).json({code: 500, message: "Database Offline"}); return; }

	// Drop collection
	try{
		let currentDatabase: Db = mongoClient.db()
		currentDatabase.dropCollection(data.collectionName)
			.catch((error) => {
				err(`Internal Server Error while dropping collection [${data.collectionName}@Datastore] | ${error}`)
				res.status(500).json({code: 500, message: "Error dropping collection"})
				return
			})
			.then(() => {
				log(`Successfully dropped collection [${data.collectionName}@Datastore]`)
				res.status(200).json({code: 200, message: "Success"})
				return	
			})
	}catch (error){
		err(`Fatal error occurred on "/delete-collection" endpoint | ${error}`)
		res.status(400).json({code: 400, message: "Invalid request body"})
		return
	}
})


// Private Methods
function _retryConnection(): void{
	let count: number = 0
	let interval: NodeJS.Timer = setInterval(async () => { log(`Retrying...(${count})`); count++; await mongoClient.connect(); }, 2000)
	mongoClient.on('serverHeartbeatSucceeded', () => { clearInterval(interval) })
}


// Run
mongoClient.on('serverHeartbeatSucceeded', () => {
	if (!_connectedToDB){ log(`Reconnected to MongoDB@Datastore`); _connectedToDB = true; }
})

mongoClient.on('serverHeartbeatFailed', () => {
	wrn(`Connection to MongoDB@Datastore was dropped | Attempting reconnection`)
	if(_connectedToDB == true){ _retryConnection() }
	_connectedToDB = false
})

_init()
module.exports = router