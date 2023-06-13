// Imports
import { LossService } from './common/classes/loss_service';
import { LossLoggingModule } from './modules/logging_module/module';
import { LossModulesBundle } from './common/interfaces/loss_modules_bundle';
import { LossArgumentParserModule } from './modules/argument_parser_module/module';
import { LossServiceConfiguration } from './common/interfaces/loss_service_configuration';

// Docstring
/**
 * Loopware Online Subsystem Server @ Server Index
 * The main starting point for every Loss instance
 * Here the required services are instanced, configured, and then activated
 */

// Enums

// Interfaces

// Classes

// Constants

// Public Variables

// Private Variables

// _init()
async function _init(): Promise<void> {
	// Check if we are running a development build
	if (process.env.NODE_ENV === 'development'){
		/**
		 * In "development" mode...
		 * 
		 * Load environment variables from an external .env file
		 * Express.js will run without the "production" optimizations (https://expressjs.com/en/advanced/best-practice-performance.html#set-node_env-to-production)
		 * Enable debugging logs in stdout and the log file
		 */

		// Log
		console.log(`[INFO] Starting Loss in "development" mode`)

		// Load environment variables
		require('dotenv').config()
	}

	// Module instancing
	const lossArgumentParserModule: LossArgumentParserModule = await LossArgumentParserModule.init()
	const lossLoggingModule: LossLoggingModule = await LossLoggingModule.init()

	// Module configuration
	lossLoggingModule.setLossEnableDebugMode((process.env.NODE_ENV === 'development'))

	// Get the list of services
	const requestedServices: Array<string> = await lossArgumentParserModule.getPassedParametersFromFlag("--services")

	// Loop through all requested services
}

// Public Methods

// Private Methods

// Run
_init()