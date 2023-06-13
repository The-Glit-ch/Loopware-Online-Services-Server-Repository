// Imports
import { LossServiceConfiguration } from '../../common/interfaces/loss_service_configuration';

// Docstring
/**
 * Loopware Online Subsystem Server @ Loss Service Class
 * Base class for every Loss service
 */

// Enums

// Interfaces

// Classes
export class LossService {
	// Public Variables

	// Private Variables
	private _lossServiceConfiguration: LossServiceConfiguration

	// Constructor
	constructor (lossServiceConfiguration: LossServiceConfiguration) {
		// Set private variables
		this._lossServiceConfiguration = lossServiceConfiguration
	}

	// Public Static Methods
	/**
	 * Creates and initializes a new `LossService`
	 * @param { LossServiceConfiguration} lossServiceConfiguration - The service configuration object 
	 * @returns { Promise<LossService> } LossService
	 */
	public static async init(lossServiceConfiguration: LossServiceConfiguration): Promise<LossService> { return new LossService(lossServiceConfiguration); }

	// Public Inherited Methods
	/**
	 * Starts a Loss service
	 * @returns { Promise<void> } void
	 */
	public async start(): Promise<void> {
		// Log
		await this._lossServiceConfiguration.lossModulesBundle.lossLoggingModule.info(`Now starting Loss@${this._lossServiceConfiguration.serviceConfiguration.serviceName}:${this._lossServiceConfiguration.serviceConfiguration.servicePort}`)

		// Run the init
		await this._lossServiceConfiguration.serviceInitFunction(this._lossServiceConfiguration.lossModulesBundle, this._lossServiceConfiguration.serviceConfiguration)

		// Log
		await this._lossServiceConfiguration.lossModulesBundle.lossLoggingModule.info(`Loss@${this._lossServiceConfiguration.serviceConfiguration.serviceName} has been started`)

		// Return
		return
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