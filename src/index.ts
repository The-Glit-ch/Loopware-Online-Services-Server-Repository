// Imports
import { LossLoggingModule } from './modules/logging_module/module';
import { LossModulesBundle } from './common/interfaces/loss_modules_bundle';


// Docstring
/**
 * Loopware Online Subsystem Server @ Index.ts
 * Starting file for Loss. All service configurations and instancing is done here
 */

// Enums

// Interfaces

// Classes

// Constants

// Public Variables

// Private Variables

// _init()
async function _init(): Promise<void> {
	// Development
	if (process.env.NODE_ENV !== 'production') { require('dotenv').config(); }

	// Module instancing
	const lossLoggingModuleInstance: LossLoggingModule = await LossLoggingModule.init()
	const lossModulesBundle: LossModulesBundle = { lossLoggingModule: lossLoggingModuleInstance, }

	// Database connections

	// Service configuration

	// Service instancing

	// Finalization

	// Run
}

// Public Methods

// Private Methods

// Run
_init()