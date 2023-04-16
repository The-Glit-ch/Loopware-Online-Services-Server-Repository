// Imports
import express, { Router } from 'express'

// Docstring
/**
 * Loopware Online Subsystem @ Localhost Middleware
 * Only allows for localhost to connect
 */

// Classes

// Enums

// Interface

// Constants
const router: Router = express.Router()

// ENV Constants

// Public Variables

// Private Variables

// _init()

// Public Methods
router.use((req, res, next) => { if (req.ip !== "::ffff:127.0.0.1") { res.status(403).json({ code: 403, message: "Forbidden", }); return; }; next(); }) // Yes this is a one liner, no I'm not changing it

// Private Methods

// Callbacks

// Run
module.exports = router