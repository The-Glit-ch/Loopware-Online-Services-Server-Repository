// Todo: Rework this system, it could be better

// Imports
import express from 'express'
import { Collection, Db, MongoClient } from 'mongodb'
import { log, err, wrn } from '../../../../shared/logging-module/src/logging_module'

// Docstring

// Enums

// Interface
// TODO: Proper Implement sort and projection and possible re-implementation
interface incomingLeaderboardData {
	leaderboardName: string,
	leaderboardCategory?: string,
	leaderboardEntry?: Object
}

// Constants
const router = express.Router()
const mongoClient: MongoClient = new MongoClient(String(process.env.MONGO_LEADERBOARD_URI))

// Public Variables

// Private Variables
var _connectedToDB: boolean = true

// _init()
async function _init():Promise<void> {
	// Connect to Mongo Instance
	try{
		await mongoClient.connect()
		log(`Connection to MongoDB@Leaderboard was successful`)
		_connectedToDB = true
	}catch (error){
		wrn(`Connection to MongoDB@Leaderboard was unsuccessful | ${error}`)
		_connectedToDB = false
	}	
}

// Public Methods | In order of CRUD
router.post("/new-leaderboard", (req, res) => {
	// Retrieve new leaderboard data
	let dataBody: any | object = req.body

	// Payload empty?
	if (Object.keys(dataBody).length === 0){ res.status(400).json({code: 400, message: "Empty request"}); return; }

	// Store data
	let leaderboardData: incomingLeaderboardData = {leaderboardName: dataBody.leaderboardName}

	// Check connection
	if (!_connectedToDB){ res.status(500).json({code: 500, message: "Database Offline"}); return; }

	// Make new leaderboard
	try{
		let currentDatabase: Db = mongoClient.db()
		currentDatabase.createCollection(leaderboardData.leaderboardName)
			.catch((_error) => { res.status(409).json({code: 409, message: "Leaderboard already made"}); return; })
			.then((newLeaderboard) => {
				if (!newLeaderboard){ return; }
				log(`Successfully created new leaderboard [${leaderboardData.leaderboardName}@Leaderboard]`)
				res.status(200).json({code: 200, message: "Success"})
				return
			})
	}catch (error){
		err(`Fatal error occurred on "/new-collection" endpoint | ${error}`)
		res.status(400).json({code: 400, message: "Invalid request body"})
		return
	}
})

router.post("/new-category", (req, res) => {
	// Retrieve new leaderboard data
	let dataBody: any | object = req.body
	
	// Payload empty?
	if (Object.keys(dataBody).length === 0){ res.status(400).json({code: 400, message: "Empty request"}); return; }

	// Store data
	let leaderboardData: incomingLeaderboardData = {leaderboardName: dataBody.leaderboardName, leaderboardCategory: dataBody.leaderboardCategory}

	// Check connection
	if (!_connectedToDB){ res.status(500).json({code: 500, message: "Database Offline"}); return; }

	// Add new leaderboard category
	try{
		let currentDatabase: Db = mongoClient.db()
		let currentLeaderboard: Collection = currentDatabase.collection(leaderboardData.leaderboardName)
		let template: Object = {"leaderboardCategory": leaderboardData.leaderboardCategory, "leaderboardData": []}

		// Null checks
		if (containsNull(template)) { res.status(400).json({code: 400, message: "Leaderboard Category cannot be empty/undefined"}); return; }
		
		// Check for duplicate category
		currentLeaderboard.findOne({"leaderboardCategory": leaderboardData.leaderboardCategory})
			.catch((error) => {
				err(`Internal Server Error while checking for duplicate categories in [${leaderboardData.leaderboardName}@Leaderboard] | ${error}`)
				res.status(500).json({code: 500, message: "Error checking for duplicate data"})
				return
			})
			.then((data) => {
				if (data) { res.status(409).json({code: 409, message: "Category already exists"}); return; }
				
				// Create new category if none exists
				currentLeaderboard.insertOne(template)
					.catch((error) => {
						err(`Internal Server Error while writing data to [${leaderboardData.leaderboardName}@Leaderboard] | ${error}`)
						res.status(500).json({code: 500, message: "Error writing data"})
						return
					})
					.then(() => {
						log(`Successfully wrote data to [${leaderboardData.leaderboardName}@Leaderboard]`)
						res.status(200).json({code: 200, message: "Success"})
						return
					})
			})
	}catch (error){
		err(`Fatal error occurred on "/new-category" endpoint | ${error}`)
		res.status(400).json({code: 400, message: "Invalid request body"})
		return
	}

})

router.post("/new-entry", (req, res) => {
	// Retrieve new leaderboard data
	let dataBody: any | object = req.body

	// Payload empty?
	if (Object.keys(dataBody).length === 0){ res.status(400).json({code: 400, message: "Empty request"}); return; }

	// Store data
	let leaderboardData: incomingLeaderboardData = {leaderboardName: dataBody.leaderboardName, leaderboardCategory: dataBody.leaderboardCategory, leaderboardEntry: dataBody.leaderboardEntry}

	// Check connection
	if (!_connectedToDB){ res.status(500).json({code: 500, message: "Database Offline"}); return; }

	// Add new leaderboard entry to X category
	try{
		let currentDatabase: Db = mongoClient.db()
		let currentLeaderboard: Collection = currentDatabase.collection(leaderboardData.leaderboardName)

		// Null checks
		if (containsNull(leaderboardData)){ res.status(400).json({code: 400, message: "Leaderboard Category/Entry cannot be empty/undefined"}); return; }

		// Fetch category
		currentLeaderboard.updateOne({"leaderboardCategory": leaderboardData.leaderboardCategory}, {"$set": {"leaderboardData": leaderboardData.leaderboardEntry}})
			.catch((error) => {

			})

	}catch (error){

	}
})

// Private Methods
/**
 * Checks if a given object contains a field with Null or Undefined
 * Returns true if contains either
 * @param { object } object - The object to check 
 * @returns { boolean } True or False if Null or Undefined is found
 */
function containsNull(object: any): boolean{
	for (var key in object){ return (object[key] == null || object[key] == undefined); }
	return false
}

// Run
//_init()
router.use((req, res, next) => {
	res.status(501).json({code: 501, message: "TBI"})
	next()
})

module.exports = router
