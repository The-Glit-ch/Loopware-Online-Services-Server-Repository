// Datastore Endpoint

// Router
import express from 'express'
const router = express.Router()

// MongoDB Client
import { Collection, Db, MongoClient } from 'mongodb'
const mongodb_uri: string | undefined = process.env.MONGO_URI					// Fetch mongo uri
const mongodb_client: MongoClient = new MongoClient(String(mongodb_uri))		// Create a new client with the URI passed
const active_database: string = "datastore-testing"								// Change when in a PROD environment
var connected: boolean = false													// Connected to database?				

// Logger
import { log, err } from '../../../shared/logger/src/logging_module'

async function init_MongoClient(): Promise<void>{
	// Attempt connection to MongoDB
	await mongodb_client.connect()

	// If we are able to connect then we should assume all is good
	log(`Connection to MongoDB instance was successful.`)
}

// (GET) || /datastore/fetch-data
// Fetches data from a specified document in a collection
router.get("/fetch-data", async (req, res) => {
	// Store incoming data
	let databody: any | undefined = req.body
	// Check if not undefined
	if (databody == undefined){ return res.status(400).json({code: 400, message: "Invalid body"}) }

	// Retrieve data from payload
	let collection_name: string = databody.dbName
	let filter_query: object = databody.dbQuery

	// Check database connection
	if (!connected){ return res.status(500).json({code: 500, message: "Internal Server Error, database is disconnected"})}

	// Kinda like "cd $PATH" but with databases
	let current_database: Db = mongodb_client.db(active_database)
	let current_collection: Collection = current_database.collection(collection_name)

	await current_collection.findOne(filter_query)
		.catch((error) => {
			err(`Internal Server Error while retrieving data || [${collection_name}@${active_database}] || ${error}`)
			return res.status(500).json({code: 500, message: "Internal Server Error while retrieving data from database"})
		})
		.then((data) => {
			log(`Successfully retrieved data || [${collection_name}@${active_database}]`)
			return res.status(200).json({code: 200, data: data})
		})
})

// (POST) || /datastore/create-new
// Creates a new collection and populates it with data
router.post("/create-new", async (req, res) => {
	// Store incoming data
	let databody: any | undefined = req.body
	// Check if not undefined
	if (databody == undefined){ return res.status(400).json({code: 400, message: "Invalid body"}) }

	// Retrieve data from payload
	let collection_name: string = databody.dbName
	let collection_data: object = databody.dbData

	// Check database connection
	if (!connected){ return res.status(500).json({code: 500, message: "Internal Server Error, database is disconnected"})}

	// Kinda like "cd $PATH" but with databases
	let current_database: Db = mongodb_client.db(active_database)
	let current_collection: Collection = current_database.collection(collection_name)

	await current_collection.insertOne(collection_data)
		.catch((error) => {
			err(`Internal Server Error while writing data || [${collection_name}@${active_database}] || ${error}`)
			return res.status(500).json({code: 500, message: "Internal Server Error while writing to database"})
		})
		.then(() => {
			log(`Successfully wrote data || [${collection_name}@${active_database}]`)
			return res.status(200).json({code: 200, message: "Successful"})
		})
})

// (PUT) || /datastore/edit-data
// Edits a document in a specified collection
router.put("/edit-data", async (req, res) => {
	// Store incoming data
	let databody: any | undefined = req.body
	// Check if not undefined
	if (databody == undefined){ return res.status(400).json({code: 400, message: "Invalid body"}) }

	// Update: Updates a specific key/value pair
	// Replace: Replaces an entire document with the specified data

	// Retrieve data from payload
	let edit_mode: string = req.body.dbEditMode
	let collection_name: string = req.body.dbName
	let replacement_data: object = req.body.dbData
	let filter_query: object = req.body.dbQuery

	// Check database connection
	if (!connected){ return res.status(500).json({code: 500, message: "Internal Server Error, database is disconnected"})}

	// Kinda like "cd $PATH" but with databases
	let current_database: Db = mongodb_client.db(active_database)
	let current_collection: Collection = current_database.collection(collection_name)

	if (edit_mode == "update"){
		// Update: Update a specific key(s)/value(s) pair
		// Handle update logic here
		await current_collection.updateOne(filter_query, replacement_data)
			.catch((error) => {
				err(`Internal Server Error while writing data || [${collection_name}@${active_database}] || ${error}`)
				return res.status(500).json({code: 500, message: "Internal Server Error while writing to database"})
			})
			.then(() => {
				log(`Successfully wrote data || [${collection_name}@${active_database}]`)
				return res.status(200).json({code: 200, message: "Successful"})
			})
	}

	if (edit_mode == "replace"){
		// Replace: Will replace an ENTIRE document
		// Handle replace logic here
		await current_collection.replaceOne(filter_query, replacement_data)
			.catch((error) => {
				err(`Internal Server Error while writing data || [${collection_name}@${active_database}] || ${error}`)
				return res.status(500).json({code: 500, message: "Internal Server Error while writing to database"})
			})
			.then(() => {
				log(`Successfully wrote data || [${collection_name}@${active_database}]`)
				return res.status(200).json({code: 200, message: "Successful"})
			})
	}
})

// MongoDB Client Initialization
init_MongoClient()
	.catch((error) => { err(`Connection to MongoDB instance was unsuccessful. Double check the URI and that the MongoDB server is active: ${error}`) })
	.then(() => { connected = true })

//TODO: This is hell
// // Auto reconnect
// setInterval(async () => {
// 	if (!connected){ await init_MongoClient().catch((err) => {}) }
// }, 10000)

// // Events
// mongodb_client.on('open', () => {
// 	if (!connected) { log(`Reconnected to database`) }
// 	connected = true
// })

// mongodb_client.on('topologyClosed', () => {
// 	err(`Database connection closed. Please reconnect database`)
// 	connected = false
// })

module.exports = router