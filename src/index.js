// Express.js 
const express = require('express')
const app = express()

// Logger
const logger = require("../custom/logger")

// Networking
const port = process.env.PORT || 8080

// JSON Middleware
app.use(express.json())

// Routing
const auth = require('../middleware/Auth')
const time = require('../routes/time')
const db = require('../routes/db')

app.use(auth)
app.use("/api/time", time)
app.use("/api/db", db)

// Init
app.listen(port, () => {
	logger.formated_log(`Server started on port ${port}`)
})