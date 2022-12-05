// Main Server File

// Express
import express from "express";
const app = express()

// *.ENV Configuration
import { config } from 'dotenv'
import { join } from 'path'
let env_err = config({path: join(process.cwd(), './resource_server/src/env/settings.env')}).error

// Logger
import { err, log, wrn } from "../../shared/logger/src/logging_module"

// Config
const port: string | number = process.env.PORT || 8080 						// Fallback to "8080" if *.env isint loaded
const auth_enabled: string | boolean = process.env.AUTH_ENABLED || false 	// Fallback to "false" if *.env isint loaded

if (env_err != undefined){ err(`.ENV file was not successfuly loaded | ${env_err.message}`) }
if (auth_enabled == false && env_err == undefined){ wrn("Authorization middleware is DISABLED") }

// Middleware
app.use(express.json())
if (auth_enabled){ app.use() }

// Routes


app.listen(port, () => {
	log(`Server started || Now listening on port ${port}`)
})
