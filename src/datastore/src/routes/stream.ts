// Imports
import express from 'express'
import { join } from 'path'
import { existsSync } from 'fs'
import { err, log } from '../../../../shared/logging-module/src/logging_module'

// Docstring
/**
 * Loopware Online Subsystem @ /stream Endpoint || Allows for the downloading/streaming of any
 * assets in the "cloud"
 */

// Enums

// Interface
interface incomingStreamData {
	fileName: string
}

// Constants
const router = express.Router()
const STREAMING_FOLDER: string = String(process.env.STREAMING_FOLDER)

// Public Variables

// Private Variables

// _init()

// Public Methods
router.get("/download", (req, res) => {
	// Retrieve data
	let dataBody: any | object = req.body

	// Payload empty?
	if (Object.keys(dataBody).length === 0){ res.status(400).json({code: 400, message: "Empty request"}); return; }

	// Store data
	let data: incomingStreamData = {fileName: dataBody.fileName}

	// Locate file
	let path: string = join(process.cwd(), STREAMING_FOLDER, data.fileName)

	if(existsSync(path)){
		log(`File found || Now streaming data`)
		res.status(200).download(path, (error) => { if (error){ err(`Error while streaming data to client | ${error}`) } })
		return
	}else{
		res.status(404).json({code: 404, message: "File not found"})
		return
	}
})


// Private Methods

// Run
module.exports = router