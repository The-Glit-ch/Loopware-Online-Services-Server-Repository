// Imports
import { LossModulesBundle } from './loss_modules_bundle';

// Docstring
/**
 * Loopware Online Subsystem Server @ Loss Service Configuration
 * Provides a simple interface for configuring a Loss service
 */

// Enums

// Interfaces
export interface LossServiceConfiguration {
	serviceConfiguration: {
		serviceName: string,
		servicePort: string,
	},
	lossModulesBundle: LossModulesBundle,
	serviceInitFunction: (lossModulesBundle: LossModulesBundle, serviceConfiguration: { serviceName: string, servicePort: string, }) => {},
}

// Classes

// Constants

// Public Variables

// Private Variables

// _init()

// Public Methods

// Private Methods

// Run