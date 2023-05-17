// Imports
import { Route, RouteModules } from '../../../../common/classes/route';
import { LossLoggingModule } from '../../../../modules/logging_module/module';
import { LossUtilityModule } from '../../../../modules/utility_module/module';
import { LossSecurityModule } from '../../../../modules/security_module/module';
import { MongoConnectionInformation } from '../../../../common/interfaces/mongo_connection_information';

import { Router, Express, Request, Response } from "express";
import { MongoClient, Db, Collection, Document, InsertOneResult, ModifyResult, WithId } from 'mongodb';

// Docstring

// Enums

// Interfaces
interface LeaderboardInteraction {
	leaderboardName: string,
	leaderboardCategory: string,
	leaderboardRecordIndex: string,
	leaderboardRecordData: object,
}

// Classes

// Constants

// Public Variables

// Private Variables
let _expressAppReference: Express
let _lossLoggingModule: LossLoggingModule
let _lossUtilityModule: LossUtilityModule
let _lossSecurityModule: LossSecurityModule

// _init()

// Public Methods | In order of CRUD (Create, Read, Update, Destroy)
async function createLeaderboard(req: Request, res: Response): Promise<void> {
	// Retrieve authorization header and request body
	const requestBody: object | any = req.body
	const authorizationHeader: string | undefined = req.headers.authorization

	// Check if the authorization header is empty
	if (!authorizationHeader) { res.status(401).json({ code: 401, message: "Empty authorization header", }); return; }

	// Check if the body is empty
	if (Object.keys(requestBody).length === 0) { res.status(400).json({ code: 400, message: "Invalid body", }); return; }

	// Split the header and hash the token
	const splitHeader: string | Array<string> = await _lossUtilityModule.returnToken(authorizationHeader, true)
	const clientTokenHash: string = await _lossSecurityModule.hash(splitHeader[0])

	// Prepare leaderboard interaction
	const newCreateLeaderboardInteraction: LeaderboardInteraction = {
		leaderboardName: (clientTokenHash + ":" + requestBody.leaderboardName),
		leaderboardCategory: "",
		leaderboardRecordIndex: "",
		leaderboardRecordData: {}
	}

	// Validate interaction object
	if (!await _lossUtilityModule.validateObject(newCreateLeaderboardInteraction)) { res.status(400).json({ code: 400, message: "Invalid body", }); return; }

	// Retrieve the database references
	const leaderboardStorageConnectionInfo: MongoConnectionInformation = _expressAppReference.get('LOSS_DATABASE_LEADERBOARDSTORAGE')

	// Check if the databases are offline
	if (leaderboardStorageConnectionInfo.isConnected === false) { res.status(503).json({ code: 503, message: "Service unavailable", }); return; }

	// Continue database initialization
	const leaderboardStorageClient: MongoClient = leaderboardStorageConnectionInfo.client
	const leaderboardStorageDb: Db = leaderboardStorageClient.db()

	// Create new leaderboard
	const wasCreatedSuccessfully: Collection<Document> | void = await leaderboardStorageDb.createCollection(newCreateLeaderboardInteraction.leaderboardName)
		.catch((error: Error) => {
			_lossLoggingModule.err(`Error while creating leaderboard in Mongo@${leaderboardStorageConnectionInfo.databaseName} | ${error}`)
			res.status(500).json({ code: 500, message: "Server error", })
			return
		})

	// Log
	_lossLoggingModule.log(`Successfully created a new leaderboard in Mongo@${leaderboardStorageConnectionInfo.databaseName}`)

	// Check if the creation was successful
	if (!wasCreatedSuccessfully) { return; }

	// Send response
	res.status(200).json({ code: 200, message: "Ok", })
	return
}

async function createCategory(req: Request, res: Response): Promise<void> {
	// Retrieve authorization header and request body
	const requestBody: object | any = req.body
	const authorizationHeader: string | undefined = req.headers.authorization

	// Check if the authorization header is empty
	if (!authorizationHeader) { res.status(401).json({ code: 401, message: "Empty authorization header", }); return; }

	// Check if the body is empty
	if (Object.keys(requestBody).length === 0) { res.status(400).json({ code: 400, message: "Invalid body", }); return; }

	// Split the header and hash the token
	const splitHeader: string | Array<string> = await _lossUtilityModule.returnToken(authorizationHeader, true)
	const clientTokenHash: string = await _lossSecurityModule.hash(splitHeader[0])

	// Prepare leaderboard interaction
	const newCreateCategoryInteraction: LeaderboardInteraction = {
		leaderboardName: (clientTokenHash + ":" + requestBody.leaderboardName),
		leaderboardCategory: requestBody.leaderboardCategory,
		leaderboardRecordIndex: "",
		leaderboardRecordData: {}
	}

	// Validate interaction object
	if (!await _lossUtilityModule.validateObject(newCreateCategoryInteraction)) { res.status(400).json({ code: 400, message: "Invalid body", }); return; }

	// Retrieve the database references
	const leaderboardStorageConnectionInfo: MongoConnectionInformation = _expressAppReference.get('LOSS_DATABASE_LEADERBOARDSTORAGE')

	// Check if the databases are offline
	if (leaderboardStorageConnectionInfo.isConnected === false) { res.status(503).json({ code: 503, message: "Service unavailable", }); return; }

	// Continue database initialization
	const leaderboardStorageClient: MongoClient = leaderboardStorageConnectionInfo.client
	const leaderboardStorageCollection: Collection = leaderboardStorageClient.db().collection(newCreateCategoryInteraction.leaderboardName)

	// Prepare payload
	const createCategoryPayload: object = {
		leaderboardCategory: newCreateCategoryInteraction.leaderboardCategory,
		leaderboardRecords: [],
	}

	// Create new category
	const wasCreatedSuccessfully: InsertOneResult<Document> | void = await leaderboardStorageCollection.insertOne(createCategoryPayload)
		.catch((error: Error) => {
			_lossLoggingModule.err(`Error while creating category in ${leaderboardStorageConnectionInfo.databaseName}@${newCreateCategoryInteraction.leaderboardName} | ${error}`)
			res.status(500).json({ code: 500, message: "Server error", })
			return
		})

	// Log
	_lossLoggingModule.log(`Successfully created a new category in ${leaderboardStorageConnectionInfo.databaseName}@${newCreateCategoryInteraction.leaderboardName}`)

	// Check if thc creation was successful
	if (!wasCreatedSuccessfully) { return; }

	// Send response
	res.status(200).json({ code: 200, message: "Ok", })
	return
}

async function addRecord(req: Request, res: Response): Promise<void> {
	// Retrieve authorization header and request body
	const requestBody: object | any = req.body
	const authorizationHeader: string | undefined = req.headers.authorization

	// Check if the authorization header is empty
	if (!authorizationHeader) { res.status(401).json({ code: 401, message: "Empty authorization header", }); return; }

	// Check if the body is empty
	if (Object.keys(requestBody).length === 0) { res.status(400).json({ code: 400, message: "Invalid body", }); return; }

	// Split the header and hash the token
	const splitHeader: string | Array<string> = await _lossUtilityModule.returnToken(authorizationHeader, true)
	const clientTokenHash: string = await _lossSecurityModule.hash(splitHeader[0])

	// Prepare leaderboard interaction
	const newAddRecordInteraction: LeaderboardInteraction = {
		leaderboardName: (clientTokenHash + ":" + requestBody.leaderboardName),
		leaderboardCategory: requestBody.leaderboardCategory,
		leaderboardRecordIndex: requestBody.leaderboardRecordIndex,
		leaderboardRecordData: requestBody.leaderboardRecordData,
	}

	// Validate interaction object
	if (!await _lossUtilityModule.validateObject(newAddRecordInteraction)) { res.status(400).json({ code: 400, message: "Invalid body", }); return; }

	// Retrieve the database references
	const leaderboardStorageConnectionInfo: MongoConnectionInformation = _expressAppReference.get('LOSS_DATABASE_LEADERBOARDSTORAGE')

	// Check if the databases are offline
	if (leaderboardStorageConnectionInfo.isConnected === false) { res.status(503).json({ code: 503, message: "Service unavailable", }); return; }

	// Continue database initialization
	const leaderboardStorageClient: MongoClient = leaderboardStorageConnectionInfo.client
	const leaderboardStorageCollection: Collection = leaderboardStorageClient.db().collection(newAddRecordInteraction.leaderboardName)

	// Prepare payload
	const fetchQuery: object = { leaderboardCategory: newAddRecordInteraction.leaderboardCategory, }
	const writeData: Record<string, any> = { leaderboardRecords: { _index: newAddRecordInteraction.leaderboardRecordIndex, data: newAddRecordInteraction.leaderboardRecordData, }, }

	// Add leaderboard record
	const wasFoundAndWrittenSuccessfully: ModifyResult<Document> | void = await leaderboardStorageCollection.findOneAndUpdate(fetchQuery, { "$push": writeData, })
		.catch((error: Error) => {
			_lossLoggingModule.err(`Error while adding record in ${leaderboardStorageConnectionInfo.databaseName}@${newAddRecordInteraction.leaderboardName} | ${error}`)
			res.status(500).json({ code: 500, message: "Server error", })
			return
		})

	// Log
	_lossLoggingModule.log(`Successfully added record in ${leaderboardStorageConnectionInfo.databaseName}@${newAddRecordInteraction.leaderboardName}`)

	// Check if the addition was successful
	if (!wasFoundAndWrittenSuccessfully) { return; }

	// Send response
	res.status(200).json({ code: 200, message: "Ok", })
	return
}

async function fetchRecords(req: Request, res: Response): Promise<void> {
	// Retrieve authorization header and request body
	const requestBody: object | any = req.body
	const authorizationHeader: string | undefined = req.headers.authorization

	// Check if the authorization header is empty
	if (!authorizationHeader) { res.status(401).json({ code: 401, message: "Empty authorization header", }); return; }

	// Check if the body is empty
	if (Object.keys(requestBody).length === 0) { res.status(400).json({ code: 400, message: "Invalid body", }); return; }

	// Split the header and hash the token
	const splitHeader: string | Array<string> = await _lossUtilityModule.returnToken(authorizationHeader, true)
	const clientTokenHash: string = await _lossSecurityModule.hash(splitHeader[0])

	// Prepare leaderboard interaction
	const newFetchRecordsInteraction: LeaderboardInteraction = {
		leaderboardName: (clientTokenHash + ":" + requestBody.leaderboardName),
		leaderboardCategory: requestBody.leaderboardCategory,
		leaderboardRecordIndex: "",
		leaderboardRecordData: {}
	}

	// Validate interaction object
	if (!await _lossUtilityModule.validateObject(newFetchRecordsInteraction)) { res.status(400).json({ code: 400, message: "Invalid body", }); return; }

	// Retrieve the database references
	const leaderboardStorageConnectionInfo: MongoConnectionInformation = _expressAppReference.get('LOSS_DATABASE_LEADERBOARDSTORAGE')

	// Check if the databases are offline
	if (leaderboardStorageConnectionInfo.isConnected === false) { res.status(503).json({ code: 503, message: "Service unavailable", }); return; }

	// Continue database initialization
	const leaderboardStorageClient: MongoClient = leaderboardStorageConnectionInfo.client
	const leaderboardStorageCollection: Collection = leaderboardStorageClient.db().collection(newFetchRecordsInteraction.leaderboardName)

	// Prepare payload
	const fetchQuery: object = { leaderboardCategory: newFetchRecordsInteraction.leaderboardCategory, }
	const fetchProjection: object = { projection: { _id: 0, }, }

	// Fetch records
	const wasFetchedSuccessfully: WithId<Document> | null | void = await leaderboardStorageCollection.findOne(fetchQuery, fetchProjection)
		.catch((error: Error) => {
			_lossLoggingModule.err(`Error while fetching data from ${leaderboardStorageConnectionInfo.databaseName}@${newFetchRecordsInteraction.leaderboardName} | ${error}`)
			res.status(500).json({ code: 500, message: "Server error", })
			return
		})

	// Log
	_lossLoggingModule.log(`Successfully fetched data from ${leaderboardStorageConnectionInfo.databaseName}@${newFetchRecordsInteraction.leaderboardName}`)

	// Check if the fetch was successful
	if (!wasFetchedSuccessfully) { res.status(404).json({ code: 404, message: "Not found", }); return; }

	// Send response
	res.status(200).json({ code: 200, message: "Ok", data: wasFetchedSuccessfully, })
	return
}

async function updateRecord(req: Request, res: Response): Promise<void> {
	// Retrieve authorization header and request body
	const requestBody: object | any = req.body
	const authorizationHeader: string | undefined = req.headers.authorization

	// Check if the authorization header is empty
	if (!authorizationHeader) { res.status(401).json({ code: 401, message: "Empty authorization header", }); return; }

	// Check if the body is empty
	if (Object.keys(requestBody).length === 0) { res.status(400).json({ code: 400, message: "Invalid body", }); return; }

	// Split the header and hash the token
	const splitHeader: string | Array<string> = await _lossUtilityModule.returnToken(authorizationHeader, true)
	const clientTokenHash: string = await _lossSecurityModule.hash(splitHeader[0])

	// Prepare leaderboard interaction
	const newUpdateRecordInteraction: LeaderboardInteraction = {
		leaderboardName: (clientTokenHash + ":" + requestBody.leaderboardName),
		leaderboardCategory: requestBody.leaderboardCategory,
		leaderboardRecordIndex: requestBody.leaderboardRecordIndex,
		leaderboardRecordData: requestBody.leaderboardRecordData,
	}

	// Validate interaction object
	if (!await _lossUtilityModule.validateObject(newUpdateRecordInteraction)) { res.status(400).json({ code: 400, message: "Invalid body", }); return; }

	// Retrieve the database references
	const leaderboardStorageConnectionInfo: MongoConnectionInformation = _expressAppReference.get('LOSS_DATABASE_LEADERBOARDSTORAGE')

	// Check if the databases are offline
	if (leaderboardStorageConnectionInfo.isConnected === false) { res.status(503).json({ code: 503, message: "Service unavailable", }); return; }

	// Continue database initialization
	const leaderboardStorageClient: MongoClient = leaderboardStorageConnectionInfo.client
	const leaderboardStorageCollection: Collection = leaderboardStorageClient.db().collection(newUpdateRecordInteraction.leaderboardName)

	// Prepare payload
	const fetchQuery: object = { leaderboardCategory: newUpdateRecordInteraction.leaderboardCategory, "leaderboardRecords._index": newUpdateRecordInteraction.leaderboardRecordIndex, }
	const writeData: object = { "leaderboardRecords.$._index": newUpdateRecordInteraction.leaderboardRecordIndex, "leaderboardRecords.$.data": newUpdateRecordInteraction.leaderboardRecordData, }

	// Update leaderboard record
	const wasFoundAndUpdatedSuccessfully: ModifyResult<Document> | void = await leaderboardStorageCollection.findOneAndUpdate(fetchQuery, { "$set": writeData, })
		.catch((error: Error) => {
			_lossLoggingModule.err(`Error while updating record in ${leaderboardStorageConnectionInfo.databaseName}@${newUpdateRecordInteraction.leaderboardName} | ${error}`)
			res.status(500).json({ code: 500, message: "Server error", })
			return
		})

	// Log
	_lossLoggingModule.log(`Successfully updated record in ${leaderboardStorageConnectionInfo.databaseName}@${newUpdateRecordInteraction.leaderboardName}`)

	// Check if the addition was successful
	if (!wasFoundAndUpdatedSuccessfully) { return; }

	// Send response
	res.status(200).json({ code: 200, message: "Ok", })
	return
}

async function deleteRecord(req: Request, res: Response): Promise<void> {
	// Retrieve authorization header and request body
	const requestBody: object | any = req.body
	const authorizationHeader: string | undefined = req.headers.authorization

	// Check if the authorization header is empty
	if (!authorizationHeader) { res.status(401).json({ code: 401, message: "Empty authorization header", }); return; }

	// Check if the body is empty
	if (Object.keys(requestBody).length === 0) { res.status(400).json({ code: 400, message: "Invalid body", }); return; }

	// Split the header and hash the token
	const splitHeader: string | Array<string> = await _lossUtilityModule.returnToken(authorizationHeader, true)
	const clientTokenHash: string = await _lossSecurityModule.hash(splitHeader[0])

	// Prepare leaderboard interaction
	const newDeleteRecordInteraction: LeaderboardInteraction = {
		leaderboardName: (clientTokenHash + ":" + requestBody.leaderboardName),
		leaderboardCategory: requestBody.leaderboardCategory,
		leaderboardRecordIndex: requestBody.leaderboardRecordIndex,
		leaderboardRecordData: {},
	}

	// Validate interaction object
	if (!await _lossUtilityModule.validateObject(newDeleteRecordInteraction)) { res.status(400).json({ code: 400, message: "Invalid body", }); return; }

	// Retrieve the database references
	const leaderboardStorageConnectionInfo: MongoConnectionInformation = _expressAppReference.get('LOSS_DATABASE_LEADERBOARDSTORAGE')

	// Check if the databases are offline
	if (leaderboardStorageConnectionInfo.isConnected === false) { res.status(503).json({ code: 503, message: "Service unavailable", }); return; }

	// Continue database initialization
	const leaderboardStorageClient: MongoClient = leaderboardStorageConnectionInfo.client
	const leaderboardStorageCollection: Collection = leaderboardStorageClient.db().collection(newDeleteRecordInteraction.leaderboardName)

	// Prepare payload
	const fetchQuery: object = { leaderboardCategory: newDeleteRecordInteraction.leaderboardCategory, "leaderboardRecords._index": newDeleteRecordInteraction.leaderboardRecordIndex, }
	const deleteWrite: object = { leaderboardRecords: { _index: newDeleteRecordInteraction.leaderboardRecordIndex, }, }

	// Delete leaderboard record
	const wasFoundAndDeletedSuccessfully: ModifyResult<Document> | void = await leaderboardStorageCollection.findOneAndUpdate(fetchQuery, { "$pull": deleteWrite, })
		.catch((error: Error) => {
			_lossLoggingModule.err(`Error while deleting record in ${leaderboardStorageConnectionInfo.databaseName}@${newDeleteRecordInteraction.leaderboardName} | ${error}`)
			res.status(500).json({ code: 500, message: "Server error", })
			return
		})

	// Log
	_lossLoggingModule.log(`Successfully deleted record in ${leaderboardStorageConnectionInfo.databaseName}@${newDeleteRecordInteraction.leaderboardName}`)

	// Check if the deletion was successful
	if (!wasFoundAndDeletedSuccessfully) { return; }

	// Send response
	res.status(200).json({ code: 200, message: "Ok", })
	return
}

async function deleteCategory(req: Request, res: Response): Promise<void> {
	// Retrieve authorization header and request body
	const requestBody: object | any = req.body
	const authorizationHeader: string | undefined = req.headers.authorization

	// Check if the authorization header is empty
	if (!authorizationHeader) { res.status(401).json({ code: 401, message: "Empty authorization header", }); return; }

	// Check if the body is empty
	if (Object.keys(requestBody).length === 0) { res.status(400).json({ code: 400, message: "Invalid body", }); return; }

	// Split the header and hash the token
	const splitHeader: string | Array<string> = await _lossUtilityModule.returnToken(authorizationHeader, true)
	const clientTokenHash: string = await _lossSecurityModule.hash(splitHeader[0])

	// Prepare leaderboard interaction
	const newDeleteCategoryInteraction: LeaderboardInteraction = {
		leaderboardName: (clientTokenHash + ":" + requestBody.leaderboardName),
		leaderboardCategory: requestBody.leaderboardCategory,
		leaderboardRecordIndex: "",
		leaderboardRecordData: {}
	}

	// Validate interaction object
	if (!await _lossUtilityModule.validateObject(newDeleteCategoryInteraction)) { res.status(400).json({ code: 400, message: "Invalid body", }); return; }

	// Retrieve the database references
	const leaderboardStorageConnectionInfo: MongoConnectionInformation = _expressAppReference.get('LOSS_DATABASE_LEADERBOARDSTORAGE')

	// Check if the databases are offline
	if (leaderboardStorageConnectionInfo.isConnected === false) { res.status(503).json({ code: 503, message: "Service unavailable", }); return; }

	// Continue database initialization
	const leaderboardStorageClient: MongoClient = leaderboardStorageConnectionInfo.client
	const leaderboardStorageCollection: Collection = leaderboardStorageClient.db().collection(newDeleteCategoryInteraction.leaderboardName)

	// Prepare payload
	const fetchQuery: object = { leaderboardCategory: newDeleteCategoryInteraction.leaderboardCategory, }

	// Delete leaderboard category
	const wasFoundAndDeletedSuccessfully: ModifyResult<Document> | void = await leaderboardStorageCollection.findOneAndDelete(fetchQuery)
		.catch((error: Error) => {
			_lossLoggingModule.err(`Error while deleting category in ${leaderboardStorageConnectionInfo.databaseName}@${newDeleteCategoryInteraction.leaderboardName} | ${error}`)
			res.status(500).json({ code: 500, message: "Server error", })
			return
		})

	// Log
	_lossLoggingModule.log(`Successfully found and deleted category in Mongo@${leaderboardStorageConnectionInfo.databaseName}`)

	// Check if the deletion was successful
	if (!wasFoundAndDeletedSuccessfully) { return; }

	// Send response
	res.status(200).json({ code: 200, message: "Ok", })
	return
}

async function deleteLeaderboard(req: Request, res: Response): Promise<void> {
	// Retrieve authorization header and request body
	const requestBody: object | any = req.body
	const authorizationHeader: string | undefined = req.headers.authorization

	// Check if the authorization header is empty
	if (!authorizationHeader) { res.status(401).json({ code: 401, message: "Empty authorization header", }); return; }

	// Check if the body is empty
	if (Object.keys(requestBody).length === 0) { res.status(400).json({ code: 400, message: "Invalid body", }); return; }

	// Split the header and hash the token
	const splitHeader: string | Array<string> = await _lossUtilityModule.returnToken(authorizationHeader, true)
	const clientTokenHash: string = await _lossSecurityModule.hash(splitHeader[0])

	// Prepare leaderboard interaction
	const newDeleteLeaderboardInteraction: LeaderboardInteraction = {
		leaderboardName: (clientTokenHash + ":" + requestBody.leaderboardName),
		leaderboardCategory: "",
		leaderboardRecordIndex: "",
		leaderboardRecordData: {}
	}

	// Validate interaction object
	if (!await _lossUtilityModule.validateObject(newDeleteLeaderboardInteraction)) { res.status(400).json({ code: 400, message: "Invalid body", }); return; }

	// Retrieve the database references
	const leaderboardStorageConnectionInfo: MongoConnectionInformation = _expressAppReference.get('LOSS_DATABASE_LEADERBOARDSTORAGE')

	// Check if the databases are offline
	if (leaderboardStorageConnectionInfo.isConnected === false) { res.status(503).json({ code: 503, message: "Service unavailable", }); return; }

	// Continue database initialization
	const leaderboardStorageClient: MongoClient = leaderboardStorageConnectionInfo.client
	const leaderboardStorageDb: Db = leaderboardStorageClient.db()

	// Delete leaderboard
	const wasDeletedSuccessfully: boolean | void = await leaderboardStorageDb.dropCollection(newDeleteLeaderboardInteraction.leaderboardName)
		.catch((error: Error) => {
			_lossLoggingModule.err(`Error while deleting leaderboard in Mongo@${leaderboardStorageConnectionInfo.databaseName} | ${error}`)
			res.status(500).json({ code: 500, message: "Server error", })
			return
		})

	// Log
	_lossLoggingModule.log(`Successfully deleted a leaderboard in Mongo@${leaderboardStorageConnectionInfo.databaseName}`)

	// Check if the creation was successful
	if (!wasDeletedSuccessfully) { return; }

	// Send response
	res.status(200).json({ code: 200, message: "Ok", })
	return
}

// Private Methods

// Run
module.exports.init = async function (expressApp: Express, loadedRouteModules: RouteModules): Promise<Router> {
	// Create a new route instance
	const cosmicstorageLeaderboardServiceRoute: Route = await Route.init(expressApp, loadedRouteModules)

	// Get references
	const app: Express = await cosmicstorageLeaderboardServiceRoute.getApp()
	const router: Router = await cosmicstorageLeaderboardServiceRoute.getRouter()
	const modules: RouteModules = await cosmicstorageLeaderboardServiceRoute.getModules()

	// Set references
	_expressAppReference = app
	_lossLoggingModule = modules.lossLoggingModule
	_lossUtilityModule = modules.lossUtilityModule
	_lossSecurityModule = modules.lossSecurityModule

	// Setup endpoints
	router.post("/new-leaderboard", createLeaderboard)
	router.post("/new-category", createCategory)
	router.post("/add-record", addRecord)
	router.get("/fetch-records", fetchRecords)
	router.patch("/update-record", updateRecord)
	router.delete("/delete-record", deleteRecord)
	router.delete("/delete-category", deleteCategory)
	router.delete("/delete-leaderboard", deleteLeaderboard)


	// Return router
	return router
}