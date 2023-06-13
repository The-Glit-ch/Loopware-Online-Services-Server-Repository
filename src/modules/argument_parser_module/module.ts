// Imports

// Docstring
/**
 * Loopware Online Subsystem Server @ Argument Parser Module
 * A simple argument parser for Loss
 */

// Enums

// Interfaces

// Classes
export class LossArgumentParserModule {
	// Public Variables

	// Private Variables

	// Constructor

	// Public Static Methods
	/**
	 * Initializes and returns a new `LossArgumentParserModule` instance
	 * @returns { Promise<LossArgumentParserModule> }
	 */
	public static async init(): Promise<LossArgumentParserModule> { return new LossArgumentParserModule(); }

	// Public Inherited Methods
	/**
	 * Returns the passed parameters for a specific flag
	 * @param { string } flag - The flag to check for 
	 * @returns { Promise<Array<string>> } String[]
	 */
	public async getPassedParametersFromFlag(flag: string): Promise<Array<string>> {
		// Check if the flag contains "=" at the end, if not add it
		if (flag[-1] !== "="){ flag = flag + "="; }

		// Get the current list of passed arguments
		const args: Array<string> = process.argv.splice(2)

		// Check for the specified flags
		for (const arg in args) {
			// Skip if the arg does not match the specified flag
			if (!args[arg].startsWith(flag)){ continue; }

			// Get the data passed
			const data: Array<string> = args[arg].replace(flag, "").split(",")

			// Return
			return data
		}

		// Return if nothing was found
		return []
	}

	// Private Static Methods

	// Private Inherited Methods
}

// Constants

// Public Variables

// Private Variables

// _init()

// Public Methods

// Private Methods

// Run