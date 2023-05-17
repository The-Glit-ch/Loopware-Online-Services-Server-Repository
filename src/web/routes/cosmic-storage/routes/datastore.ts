// Imports
import { Route, RouteModules } from '../../../../common/classes/route';
import { LossLoggingModule } from '../../../../modules/logging_module/module';
import { LossUtilityModule } from '../../../../modules/utility_module/module';
import { LossSecurityModule } from '../../../../modules/security_module/module';
import { MongoConnectionInformation } from '../../../../common/interfaces/mongo_connection_information';

import { Express, Request, Response, Router } from 'express';
import { Collection, Db, Document, InsertOneResult, ModifyResult, MongoClient, WithId } from 'mongodb';

// Docstring

// Enums

// Interfaces
interface DatastoreInteraction {
	collectionName: string,
	fetchQuery: {
		query: object,
		projection: object,
	},
	writeData: object,
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
async function createCollection(req: Request, res: Response): Promise<void> {
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

	// Prepare database interaction
	const newCreateCollectionInteraction: DatastoreInteraction = {
		collectionName: (clientTokenHash + ":" + requestBody.collectionName),
		fetchQuery: { query: {}, projection: {}, },
		writeData: {},
	}

	// Validate interaction object
	if (!await _lossUtilityModule.validateObject(newCreateCollectionInteraction)) { res.status(400).json({ code: 400, message: "Invalid body", }); return; }

	// Retrieve the database references
	const datastoreStorageConnectionInfo: MongoConnectionInformation = _expressAppReference.get('LOSS_DATABASE_DATASTORESTORAGE')

	// Check if the databases are offline
	if (datastoreStorageConnectionInfo.isConnected === false) { res.status(503).json({ code: 503, message: "Service unavailable", }); return; }

	// Continue database initialization
	const datastoreStorageClient: MongoClient = datastoreStorageConnectionInfo.client
	const datastoreStorageDb: Db = datastoreStorageClient.db()

	// Create new collection
	const wasCreatedSuccessfully: Collection<Document> | void = await datastoreStorageDb.createCollection(newCreateCollectionInteraction.collectionName)
		.catch((error: Error) => {
			_lossLoggingModule.err(`Error while creating collection in Mongo@${datastoreStorageConnectionInfo.databaseName} | ${error}`)
			res.status(500).json({ code: 500, message: "Server error", })
			return
		})

	// Log
	_lossLoggingModule.log(`Successfully created a new collection in Mongo@${datastoreStorageConnectionInfo.databaseName}`)

	// Check if the creation was successful
	if (!wasCreatedSuccessfully) { return; }

	// Send response
	res.status(200).json({ code: 200, message: "Ok", })
	return
}

async function writeData(req: Request, res: Response): Promise<void> {
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

	// Prepare database interaction
	const newWriteDataInteraction: DatastoreInteraction = {
		collectionName: (clientTokenHash + ":" + requestBody.collectionName),
		fetchQuery: { query: {}, projection: {}, },
		writeData: requestBody.writeData,
	}

	// Validate interaction object
	if (!await _lossUtilityModule.validateObject(newWriteDataInteraction)) { res.status(400).json({ code: 400, message: "Invalid body", }); return; }

	// Retrieve the database references
	const datastoreStorageConnectionInfo: MongoConnectionInformation = _expressAppReference.get('LOSS_DATABASE_DATASTORESTORAGE')

	// Check if the databases are offline
	if (datastoreStorageConnectionInfo.isConnected === false) { res.status(503).json({ code: 503, message: "Service unavailable", }); return; }

	// Continue database initialization
	const datastoreStorageClient: MongoClient = datastoreStorageConnectionInfo.client
	const datastoreStorageCollection: Collection = datastoreStorageClient.db().collection(newWriteDataInteraction.collectionName)

	// Write data
	const wasWrittenSuccessfully: InsertOneResult<Document> | void = await datastoreStorageCollection.insertOne(newWriteDataInteraction.writeData)
		.catch((error: Error) => {
			_lossLoggingModule.err(`Error while writing data to ${datastoreStorageConnectionInfo.databaseName}@${datastoreStorageCollection.collectionName} | ${error}`)
			res.status(500).json({ code: 500, message: "Server error", })
			return
		})

	// Log
	_lossLoggingModule.log(`Successfully wrote data to ${datastoreStorageConnectionInfo.databaseName}@${datastoreStorageCollection.collectionName}`)

	// Check if the write was successful
	if (!wasWrittenSuccessfully) { return; }

	// Send response
	res.status(200).json({ code: 200, message: "Ok", })
	return
}

async function writeDataBulk(req: Request, res: Response): Promise<void> {
	// Send response
	res.status(501).json({ code: 501, message: "Not implemented", })
	return
}

async function getCollections(req: Request, res: Response): Promise<void> {
	// Send response
	res.status(501).json({ code: 501, message: "Not implemented", })
	return

	// // Retrieve authorization header
	// const authorizationHeader: string | undefined = req.headers.authorization

	// // Check if the authorization header is empty
	// if (!authorizationHeader) { res.status(401).json({ code: 401, message: "Empty authorization header", }); return; }

	// // Split the header and hash the token
	// const splitHeader: string | Array<string> = await _lossUtilityModule.returnToken(authorizationHeader, true)
	// const clientTokenHash: string = await _lossSecurityModule.hash(splitHeader[0])

	// // Retrieve the database references
	// const datastoreStorageConnectionInfo: MongoConnectionInformation = _expressAppReference.get('LOSS_DATABASE_DATASTORESTORAGE')

	// // Check if the databases are offline
	// if (datastoreStorageConnectionInfo.isConnected === false) { res.status(503).json({ code: 503, message: "Service unavailable", }); return; }

	// // Continue database initialization
	// const datastoreStorageClient: MongoClient = datastoreStorageConnectionInfo.client
	// const datastoreStorageDb: Db = datastoreStorageClient.db()

	// console.log(await datastoreStorageDb.collections())
}

async function fetchData(req: Request, res: Response): Promise<void> {
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

	// Prepare database interaction
	const newFetchDataInteraction: DatastoreInteraction = {
		collectionName: (clientTokenHash + ":" + requestBody.collectionName),
		fetchQuery: { query: requestBody.fetchQuery.query, projection: { _id: 0, }, },
		writeData: {},
	}

	// Validate interaction object
	if (!await _lossUtilityModule.validateObject(newFetchDataInteraction)) { res.status(400).json({ code: 400, message: "Invalid body", }); return; }

	// Retrieve the database references
	const datastoreStorageConnectionInfo: MongoConnectionInformation = _expressAppReference.get('LOSS_DATABASE_DATASTORESTORAGE')

	// Check if the databases are offline
	if (datastoreStorageConnectionInfo.isConnected === false) { res.status(503).json({ code: 503, message: "Service unavailable", }); return; }

	// Continue database initialization
	const datastoreStorageClient: MongoClient = datastoreStorageConnectionInfo.client
	const datastoreStorageCollection: Collection = datastoreStorageClient.db().collection(newFetchDataInteraction.collectionName)

	// Fetch data
	const wasFetchedSuccessfully: WithId<Document> | null | void = await datastoreStorageCollection.findOne(newFetchDataInteraction.fetchQuery.query, { projection: newFetchDataInteraction.fetchQuery.projection, })
		.catch((error: Error) => {
			_lossLoggingModule.err(`Error while fetching data from ${datastoreStorageConnectionInfo.databaseName}@${datastoreStorageCollection.collectionName} | ${error}`)
			res.status(500).json({ code: 500, message: "Server error", })
			return
		})

	// Log
	_lossLoggingModule.log(`Successfully fetched data from ${datastoreStorageConnectionInfo.databaseName}@${datastoreStorageCollection.collectionName}`)

	// Check if the fetch was successful
	if (!wasFetchedSuccessfully) { res.status(404).json({ code: 404, message: "Not found", }); return; }

	// Send response
	res.status(200).json({ code: 200, message: "Ok", data: wasFetchedSuccessfully, })
	return
}

async function updateData(req: Request, res: Response): Promise<void> {
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

	// Prepare database interaction
	const newUpdateDataInteraction: DatastoreInteraction = {
		collectionName: (clientTokenHash + ":" + requestBody.collectionName),
		fetchQuery: { query: requestBody.fetchQuery.query, projection: {}, },
		writeData: requestBody.writeData,
	}

	// Validate interaction object
	if (!await _lossUtilityModule.validateObject(newUpdateDataInteraction)) { res.status(400).json({ code: 400, message: "Invalid body", }); return; }

	// Retrieve the database references
	const datastoreStorageConnectionInfo: MongoConnectionInformation = _expressAppReference.get('LOSS_DATABASE_DATASTORESTORAGE')

	// Check if the databases are offline
	if (datastoreStorageConnectionInfo.isConnected === false) { res.status(503).json({ code: 503, message: "Service unavailable", }); return; }

	// Continue database initialization
	const datastoreStorageClient: MongoClient = datastoreStorageConnectionInfo.client
	const datastoreStorageCollection: Collection = datastoreStorageClient.db().collection(newUpdateDataInteraction.collectionName)

	// Find and update data
	const wasFoundAndUpdatedSuccessfully: ModifyResult<Document> | void = await datastoreStorageCollection.findOneAndUpdate(newUpdateDataInteraction.fetchQuery.query, { "$set": newUpdateDataInteraction.writeData, })
		.catch((error: Error) => {
			_lossLoggingModule.err(`Error while finding and updating data in ${datastoreStorageConnectionInfo.databaseName}@${datastoreStorageCollection.collectionName} | ${error}`)
			res.status(500).json({ code: 500, message: "Server error", })
			return
		})

	// Log
	_lossLoggingModule.log(`Successfully found and updated data in ${datastoreStorageConnectionInfo.databaseName}@${datastoreStorageCollection.collectionName}`)

	// Check if the update was successful
	if (!wasFoundAndUpdatedSuccessfully) { return; }

	// Send response
	res.status(200).json({ code: 200, message: "Ok", })
	return
}

async function updateDataBulk(req: Request, res: Response): Promise<void> {
	// Send response
	res.status(501).json({ code: 501, message: "Not implemented", })
	return
}

async function replaceData(req: Request, res: Response): Promise<void> {
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

	// Prepare database interaction
	const newReplaceDataInteraction: DatastoreInteraction = {
		collectionName: (clientTokenHash + ":" + requestBody.collectionName),
		fetchQuery: { query: requestBody.fetchQuery.query, projection: {}, },
		writeData: requestBody.writeData,
	}

	// Validate interaction object
	if (!await _lossUtilityModule.validateObject(newReplaceDataInteraction)) { res.status(400).json({ code: 400, message: "Invalid body", }); return; }

	// Retrieve the database references
	const datastoreStorageConnectionInfo: MongoConnectionInformation = _expressAppReference.get('LOSS_DATABASE_DATASTORESTORAGE')

	// Check if the databases are offline
	if (datastoreStorageConnectionInfo.isConnected === false) { res.status(503).json({ code: 503, message: "Service unavailable", }); return; }

	// Continue database initialization
	const datastoreStorageClient: MongoClient = datastoreStorageConnectionInfo.client
	const datastoreStorageCollection: Collection = datastoreStorageClient.db().collection(newReplaceDataInteraction.collectionName)

	// Find and replace data
	const wasFoundAndReplacedSuccessfully: ModifyResult<Document> | void = await datastoreStorageCollection.findOneAndReplace(newReplaceDataInteraction.fetchQuery.query, newReplaceDataInteraction.writeData)
		.catch((error: Error) => {
			_lossLoggingModule.err(`Error while finding and replacing data in ${datastoreStorageConnectionInfo.databaseName}@${datastoreStorageCollection.collectionName} | ${error}`)
			res.status(500).json({ code: 500, message: "Server error", })
			return
		})

	// Log
	_lossLoggingModule.log(`Successfully found and replaced data in ${datastoreStorageConnectionInfo.databaseName}@${datastoreStorageCollection.collectionName}`)

	// Check if the replacement was successful
	if (!wasFoundAndReplacedSuccessfully) { return; }

	// Send response
	res.status(200).json({ code: 200, message: "Ok", })
	return
}

async function deleteData(req: Request, res: Response): Promise<void> {
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

	// Prepare database interaction
	const newDeleteDataInteraction: DatastoreInteraction = {
		collectionName: (clientTokenHash + ":" + requestBody.collectionName),
		fetchQuery: { query: requestBody.fetchQuery.query, projection: {}, },
		writeData: requestBody.writeData,
	}

	// Validate interaction object
	if (!await _lossUtilityModule.validateObject(newDeleteDataInteraction)) { res.status(400).json({ code: 400, message: "Invalid body", }); return; }

	// Retrieve the database references
	const datastoreStorageConnectionInfo: MongoConnectionInformation = _expressAppReference.get('LOSS_DATABASE_DATASTORESTORAGE')

	// Check if the databases are offline
	if (datastoreStorageConnectionInfo.isConnected === false) { res.status(503).json({ code: 503, message: "Service unavailable", }); return; }

	// Continue database initialization
	const datastoreStorageClient: MongoClient = datastoreStorageConnectionInfo.client
	const datastoreStorageCollection: Collection = datastoreStorageClient.db().collection(newDeleteDataInteraction.collectionName)

	// Find and delete data
	const wasFoundAndDeletedSuccessfully: ModifyResult<Document> | void = await datastoreStorageCollection.findOneAndDelete(newDeleteDataInteraction.fetchQuery.query)
		.catch((error: Error) => {
			_lossLoggingModule.err(`Error while finding and deleting data from ${datastoreStorageConnectionInfo.databaseName}@${datastoreStorageCollection.collectionName} | ${error}`)
			res.status(500).json({ code: 500, message: "Server error", })
			return
		})

	// Log
	_lossLoggingModule.log(`Successfully found and deleted data from ${datastoreStorageConnectionInfo.databaseName}@${datastoreStorageCollection.collectionName}`)

	// Check if the deletion was successful
	if (!wasFoundAndDeletedSuccessfully) { return; }

	// Send response
	res.status(200).json({ code: 200, message: "Ok", })
	return
}

async function deleteDataBulk(req: Request, res: Response): Promise<void> {
	// Send response
	res.status(501).json({ code: 501, message: "Not implemented", })
	return
}

async function deleteCollection(req: Request, res: Response): Promise<void> {
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

	// Prepare database interaction
	const newDeleteCollectionInteraction: DatastoreInteraction = {
		collectionName: (clientTokenHash + ":" + requestBody.collectionName),
		fetchQuery: { query: {}, projection: {}, },
		writeData: {},
	}

	// Validate interaction object
	if (!await _lossUtilityModule.validateObject(newDeleteCollectionInteraction)) { res.status(400).json({ code: 400, message: "Invalid body", }); return; }

	// Retrieve the database references
	const datastoreStorageConnectionInfo: MongoConnectionInformation = _expressAppReference.get('LOSS_DATABASE_DATASTORESTORAGE')

	// Check if the databases are offline
	if (datastoreStorageConnectionInfo.isConnected === false) { res.status(503).json({ code: 503, message: "Service unavailable", }); return; }

	// Continue database initialization
	const datastoreStorageClient: MongoClient = datastoreStorageConnectionInfo.client
	const datastoreStorageDb: Db = datastoreStorageClient.db()

	// Delete collection
	const wasDeletedSuccessfully = await datastoreStorageDb.dropCollection(newDeleteCollectionInteraction.collectionName)
		.catch((error: Error) => {
			_lossLoggingModule.err(`Error while deleting collection in Mongo@${datastoreStorageConnectionInfo.databaseName} | ${error}`)
			res.status(500).json({ code: 500, message: "Server error", })
			return
		})

	// Log
	_lossLoggingModule.log(`Successfully deleted collection in Mongo@${datastoreStorageConnectionInfo.databaseName}`)

	// Check if the deletion was successful
	if (!wasDeletedSuccessfully) { return; }

	// Send response
	res.status(200).json({ code: 200, message: "Ok", })
	return
}
// Private Methods

// Run
module.exports.init = async function (expressApp: Express, loadedRouteModules: RouteModules): Promise<Router> {
	// Create a new route instance
	const cosmicstorageDatastoreRoute: Route = await Route.init(expressApp, loadedRouteModules)

	// Get references
	const app: Express = await cosmicstorageDatastoreRoute.getApp()
	const router: Router = await cosmicstorageDatastoreRoute.getRouter()
	const modules: RouteModules = await cosmicstorageDatastoreRoute.getModules()

	// Set references
	_expressAppReference = app
	_lossLoggingModule = modules.lossLoggingModule
	_lossUtilityModule = modules.lossUtilityModule
	_lossSecurityModule = modules.lossSecurityModule

	// Setup endpoints
	router.post("/new-collection", createCollection)
	router.post("/write-data", writeData)
	router.post("/write-data-bulk", writeDataBulk)
	router.get("/get-collections", getCollections)
	router.get("/fetch-data", fetchData)
	router.patch("/update-data", updateData)
	router.patch("/update-data-bulk", updateDataBulk)
	router.put("/replace-data", replaceData)
	router.delete("/delete-data", deleteData)
	router.delete("/delete-data-bulk", deleteDataBulk)
	router.delete("/delete-collection", deleteCollection)

	// Return router
	return router
}