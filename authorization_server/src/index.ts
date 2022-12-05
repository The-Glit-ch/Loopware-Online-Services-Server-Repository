// Authorization Server
// Handles both User and Server Authorization via JWT

// Express
import express from 'express'
const app = express()

// *.ENV Configuration
import { config } from 'dotenv'
import { join } from 'path'
let env_err = config({path: join(process.cwd(), './authorization_server/src/env/settings.env')}).error

// Logger
import { log, err } from "../../shared/logger/src/logging_module"

// Config
const port: string | number = process.env.PORT || 8081 // Fallback to port "8081" if .env is not loaded

if (env_err != undefined){ err(`.ENV file was not successfuly loaded | ${env_err.message}`) }

// Middleware
app.use(express.json())

// Routes
const user_endpoint = require('./routes/user')
const server_endpoint = require('./routes/server')

app.use("/auth/user", user_endpoint)
app.use("/auth/server", server_endpoint)


app.listen(port, () => {
	log(`Server started || Now listening on port ${port}`)
})