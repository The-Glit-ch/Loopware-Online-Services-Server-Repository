// Datastore Endpoint

// Router
import express from 'express'
const router = express.Router()

// MongoDB Client
import { Db, MongoClient } from 'mongodb'
const mongodb_uri: string = `mongodb://${process.env.IP}:27017` 		// Replace with URI of MongoDB Database
const mongodb_client: MongoClient = new MongoClient(mongodb_uri)		// Create a new client with the URI passed
const current_database: string = "datastore-testing"							// Change when in a PROD enviroment

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
	let databody: any | undefined = req.body
	if (databody == undefined){ return res.status(400).json({code: 400, message: "Invalid body"}) }

	let collection_name: string = databody.dbName
	let search_query: object = databody.dbQuery

	let current_db: Db = mongodb_client.db(current_database)
	let return_data = await current_db.collection(collection_name).findOne(search_query)
		.catch((err) => {
			err(`Internal Server Error while retrieving data from collection "${collection_name}" @ database "${current_database}"`)
			return res.status(500).json({code: 500, message: "Internal Server Error while retrieving data from collection"})
		})
	
	log(`Successfully retreived data from collection "${collection_name}"`)
	return res.status(200).json({code: 200, data: return_data})
})

// (POST) || /datastore/create-new
// Creates a new collection and populates it with data
router.post("/datastore/create-new", async (req, res) => {
	let databody: any | undefined = req.body
	if (databody == undefined){ return res.status(400).json({code: 400, message: "Invalid body"}) }

	let newCollectionName: string = databody.dbName
	let newCollectioData: object = databody.dbData

	let current_db: Db = mongodb_client.db(current_database)
	await current_db.collection(newCollectionName).insertOne(newCollectioData)
		.catch((err) => {
			err(`Internal Server Error while writing to collection "${err}" @ database "${current_database}"`)
			return res.status(500).json({code: 500, message: "Internal Server Error while writing to database"})
		})
		.then(() => {
			log(`Successfully wrote to collection "${newCollectionName}"`)
			return res.status(200).json({code: 200, message: "Successful"})
		})
})

// (PUT) || /datastore/edit-data
// Edits a document in a specified collection
router.put("/datastore/edit-data", (req, res) => {
	let databody: any | undefined = req.body
	if (databody == undefined){ return res.status(400).json({code: 400, message: "Invalid body"}) }

})

// MongoDB Client Initilization
init_MongoClient()
	.catch((err) => { 
		err(`Connection to MongoDB instances was unsuccessful. Double check the URI and that the MongoDB server is active: ${err}`)
		mongodb_client.close()
	})

module.exports = router