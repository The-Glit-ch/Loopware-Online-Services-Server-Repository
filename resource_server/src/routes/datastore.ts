// Router
import express from 'express'
const router = express.Router()

// MongoDB Client
import { MongoClient } from 'mongodb'
const url: string = 'mongodb://xxxxxxxxxxx:27017'
const database_client: MongoClient = new MongoClient(url)
const database_name: string = 'testProject'

// Authorization Module
import { verify_and_decode_jwt } from '../../../shared/auth/src/authorization_module'

// Logger
import { log } from '../../../shared/logger/src/logging_module'

// Initilization
async function main() {
	// Connect to database
	await database_client.connect()
	log(`Connected to MongoDB ${database_name}`)
}

router.post("/datastore", (req, res) => {
	res.status(200).json({"message": "200"})
})

main()

module.exports = router