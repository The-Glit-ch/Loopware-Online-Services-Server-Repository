// Resource Server
// Handles anything database related

// Express
import express from "express";
const app = express()

// *.ENV Configuration
// Only for testing, in PROD please modify the dockerfile to contain your environment variables
// Uncomment if testing
import { config } from 'dotenv'
import { join } from 'path'
let env_err = config({path: join(process.cwd(), './.env/rs-config.env')}).error

// Logger
import { err, log, wrn } from '../../shared/logger/src/logging_module'

// Config
const port: string | number = process.env.PORT || 8080 						// Fallback to "8080" if *.env isn't loaded
const auth_enabled: string | boolean = process.env.AUTH_ENABLED || false 	// Fallback to "false" if *.env isn't loaded

// Sanity Checks
if (env_err != undefined){ err(`.ENV file was not successfully loaded | ${env_err.message}`) }
if (auth_enabled == false && env_err == undefined){ wrn("Authorization middleware is DISABLED") }

// Middleware
app.use(express.json())

// Logging Middleware
app.use( (req, _, next) => {
	log(`New "${req.protocol.toUpperCase()}" connection to "${req.baseUrl + req.url}" from "${req.ip}" using "${req.method.toUpperCase()}"`)
	next()
})

// Routes
const auth = require('./middleware/auth')
const datastore = require('./routes/datastore')
if (auth_enabled){ app.use(auth) }
app.use("/rs/datastore", datastore)

// Start Server
app.listen(port, () => {
	log(`Server started || Now listening on port ${port}`)
})
