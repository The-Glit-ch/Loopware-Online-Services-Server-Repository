// Imports
import { LossLoggingModule } from '../../modules/logging_module/module';
import { LossArgumentParserModule } from '../../modules/argument_parser_module/module';

// Docstring
/**
 * Loopware Online Subsystem Server @ Loss Modules Bundle
 * Provides a simple interface for "bundling" loss modules
 */

// Enums

// Interfaces
export interface LossModulesBundle {
	lossArgumentParserModule: LossArgumentParserModule,
	lossLoggingModule: LossLoggingModule,
}

// Classes

// Constants

// Public Variables

// Private Variables

// _init()

// Public Methods

// Private Methods

// Run