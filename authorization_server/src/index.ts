// Authorization Server
// Handles both User and Server Authorization via JWT

// Express
import express from 'express'
const app = express()

// *.ENV Configuration
// Only for testing, in PROD please modify the dockerfile to contain your environment variables
// Uncomment if testing
// import { config } from 'dotenv'
// import { join } from 'path'
// let env_err = config({path: join(process.cwd(), './authorization_server/env/config.env')}).error
// if (env_err != undefined){ err(`.ENV file was not successfully loaded | ${env_err.message}`) }

// Logger
import { log, err } from "../../shared/logger/src/logging_module"

// Config
const port: string | number = process.env.PORT || 8081 // Fallback to port "8081" if .env is not loaded

// Middleware
app.use(express.json())

// Logging Middleware
app.use( (req, _, next) => {
	log(`New "${req.protocol.toUpperCase()}" connection to "${req.baseUrl + req.url}" from "${req.ip}" using "${req.method.toUpperCase()}"`)
	next()
})

// Routes
const user_endpoint = require('./routes/user')
const server_endpoint = require('./routes/server')

app.use("/auth/user", user_endpoint)
app.use("/auth/server", server_endpoint)


// Start Server
app.listen(port, () => {
	log(`Server started || Now listening on port ${port}`)
})