// Datastore Endpoint

// Router
import express from 'express'
const router = express.Router()

// MongoDB Client
import { Db, MongoClient } from 'mongodb'
const mongodb_uri: string = 'mongodb://XX.XX.XX.XXX:27017' 				// Replace with URI of MongoDB Database
const mongodb_client: MongoClient = new MongoClient(mongodb_uri)		// Create a new client with the URI passed

// Logger
import { log, err } from '../../../shared/logger/src/logging_module'

// MongoDB Client Initilization
async function init_MongoClient(): Promise<void>{
	// Attemp connection to MongoDB
	await mongodb_client.connect()

	// If we are able to connect then we should assume all is good
	log(`Connection to MongoDB instance was successful.`)
}

router.post("/datastore/new", (req, res) => {
	let databody: any | undefined = req.body
	if(databody == undefined){ return res.status(400).json({err: 400, message: "Invalid body"}) }

	let newDatabaseName: string = databody.dbName
	let newDatabaseData: string = databody.dbData

	let current_db: Db = mongodb_client.db(newDatabaseName)
	current_db.collection("Data")

	res.status(200).json({"message": "200"})
})

init_MongoClient()
	.catch((err) => { 
		err(`Connection to MongoDB instances was unsuccessful. Double check the URI and that the MongoDB server is active: ${err}`)
		mongodb_client.close()
	})

module.exports = router