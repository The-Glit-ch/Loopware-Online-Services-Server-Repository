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

app.use(auth)
app.use("/time", time)

// Init
app.listen(port, () => {
	logger.formated_log(`Server started on port ${port}`)
})