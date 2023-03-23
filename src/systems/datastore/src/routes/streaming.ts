// Imports
import { join } from 'path'
import { existsSync } from 'fs'
import { wrn, log, err } from '../../../../shared/logging-module/src/logging_module'
import express, { Router } from 'express'

// Docstring
/**
 * Loopware Online Subsystem @ Streaming Endpoint || Simple endpoint that allows downloading of resources from a dedicated folder
 * 
 * MISC: Might "decouple"(is that even right) this to allow for reading from like a separate drive or some idk
 */

// Enums

// Interface

// Constants
const router: Router = express.Router()

// ENV Constants
const STREAMING_FOLDER_PATH: string = join(process.cwd(), String(process.env.DS_STREAMING_FOLDER))

// Public Variables

// Private Variables

// _init()
function _init(): void {
	if (!_isValidDirectory()) { wrn(`Streaming directory -> \"${STREAMING_FOLDER_PATH}\" is not valid`) }
}

// Public Methods
router.get("/stream", (req, res) => {
	// Retrieve data
	let incomingData: object | any = req.body

	// Check if we received an empty body
	if (Object.keys(incomingData).length === 0) { res.status(400).json({ code: 400, message: "Empty body" }); return; }

	// Attempt to locate the file and stream it
	let filePath: string = join(STREAMING_FOLDER_PATH, incomingData.fileName)
	if (existsSync(filePath)) {
		log(`File \"${incomingData.fileName}\" found || Now streaming data`)
		res.status(200).download(filePath, (error) => { if (error) { err(`Error while streaming data to client | ${error}`); return; } })
		return
	} else {
		res.status(404).json({ code: 404, message: "File not found" })
		return
	}
})

// Private Methods
/**
 * Checks if the `STREAMING_FOLDER_PATH` is valid
 * @returns { boolean } Boolean
 */
function _isValidDirectory(): boolean { return existsSync(STREAMING_FOLDER_PATH) }

// Run
_init()
module.exports = router