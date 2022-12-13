// Datastore Endpoint

// Router
import express from 'express'
const router = express.Router()

// MongoDB Client
import { Collection, Db, MongoClient } from 'mongodb'
const mongodb_uri: string = `mongodb://${process.env.IP}:27017` 		// Replace with URI of MongoDB Database
const mongodb_client: MongoClient = new MongoClient(mongodb_uri)		// Create a new client with the URI passed
const active_database: string = "datastore-testing"						// Change when in a PROD enviroment

// Logger
import { log } from '../../../shared/logger/src/logging_module'

async function init_MongoClient(): Promise<void>{
	// Attemp connection to MongoDB
	await mongodb_client.connect()

	// If we are able to connect then we should assume all is good
	log(`Connection to MongoDB instance was successful.`)
}

// (GET) || /datastore/fetch-data
// Fetches data from a specified document in a collection
router.get("/datastore/fetch-data", async (req, res) => {
	// Store incoming data
	let databody: any | undefined = req.body
	// Check if not undefined
	if (databody == undefined){ return res.status(400).json({code: 400, message: "Invalid body"}) }

	// Retrieve data from payload
	let collection_name: string = databody.dbName
	let filter_query: object = databody.dbQuery

	// Kinda like "cd $PATH" but with databases
	let current_database: Db = mongodb_client.db(active_database)
	let current_collection: Collection = current_database.collection(collection_name)

	await current_collection.findOne(filter_query)
		.catch((err) => {
			err(`Internal Server Error while retrieving data || [${collection_name}@${active_database}]`)
			return res.status(500).json({code: 500, message: "Internal Server Error while retrieving data from database"})
		})
		.then((data) => {
			log(`Successfully retreived data || [${collection_name}@${active_database}]`)
			return res.status(200).json({code: 200, data: data})
		})
})

// (POST) || /datastore/create-new
// Creates a new collection and populates it with data
router.post("/datastore/create-new", async (req, res) => {
	// Store incoming data
	let databody: any | undefined = req.body
	// Check if not undefined
	if (databody == undefined){ return res.status(400).json({code: 400, message: "Invalid body"}) }

	// Retrieve data from payload
	let collection_name: string = databody.dbName
	let collection_data: object = databody.dbData

	// Kinda like "cd $PATH" but with databases
	let current_database: Db = mongodb_client.db(active_database)
	let current_collecion: Collection = current_database.collection(collection_name)

	await current_collecion.insertOne(collection_data)
		.catch((err) => {
			err(`Internal Server Error while writing data || [${collection_name}@${active_database}]`)
			return res.status(500).json({code: 500, message: "Internal Server Error while writing to database"})
		})
		.then(() => {
			log(`Successfully wrote data || [${collection_name}@${active_database}]`)
			return res.status(200).json({code: 200, message: "Successful"})
		})
})

// (PUT) || /datastore/edit-data
// Edits a document in a specified collection
router.put("/datastore/edit-data", async (req, res) => {
	// Store incoming data
	let databody: any | undefined = req.body
	// Check if not undefined
	if (databody == undefined){ return res.status(400).json({code: 400, message: "Invalid body"}) }

	// Update: Updates a specific key/value pair
	// Replace: Replcaes an entire document with the specified data

	// Retrieve data from payload
	let edit_mode: string = req.body.dbEditMode
	let collection_name: string = req.body.dbName
	let replacement_data: object = req.body.dbData
	let filter_query: object = req.body.dbQuery

	// Kinda like "cd $PATH" but with databases
	let current_database: Db = mongodb_client.db(active_database)
	let current_collecion: Collection = current_database.collection(collection_name)

	if (edit_mode == "update"){
		// Update: Update a specific key(s)/value(s) pair
		// Handle update logic here
		await current_collecion.updateOne(filter_query, replacement_data)
			.catch((err) => {
				err(`Internal Server Error while writing data || [${collection_name}@${active_database}]`)
				return res.status(500).json({code: 500, message: "Internal Server Error while writing to database"})
			})
			.then(() => {
				log(`Successfully wrote data || [${collection_name}@${active_database}]`)
				return res.status(200).json({code: 200, message: "Successful"})
			})
	}

	if (edit_mode == "replace"){
		// Handle replcae logic here
		return
	}
})

// MongoDB Client Initilization
init_MongoClient()
	.catch((err) => { 
		err(`Connection to MongoDB instances was unsuccessful. Double check the URI and that the MongoDB server is active: ${err}`)
		mongodb_client.close()
	})

module.exports = router