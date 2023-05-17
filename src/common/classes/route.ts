// Imports
import { LossUtilityModule } from '../../modules/utility_module/module';
import { LossLoggingModule } from '../../modules/logging_module/module';
import { LossSecurityModule } from '../../modules/security_module/module';

import express, { Express, Router } from 'express';

// Docstring
/**
 * Loopware Online Subsystem @ Route Class
 * Simple class that provides some boilerplate for creating routes
 */

// Enums

// Interfaces
export interface RouteModules {
	lossLoggingModule: LossLoggingModule,
	lossUtilityModule: LossUtilityModule,
	lossSecurityModule: LossSecurityModule,
}

// Classes
export class Route {
	// Public Variables

	// Private Variables
	private _app: Express
	private _router: Router
	private _modules: RouteModules

	// Constructor
	constructor(expressApp: Express, loadedRouteModules: RouteModules) {
		// Set internal variables
		this._app = expressApp
		this._router = express.Router()
		this._modules = loadedRouteModules
	}

	// Public Static Methods
	public static async init(expressApp: Express, loadedRouteModules: RouteModules): Promise<Route> { return new Route(expressApp, loadedRouteModules); }

	// Public Inherited Methods
	/**
	 * Returns the Express "app" reference
	 * @returns { Promise<Express> } App
	 */
	public async getApp(): Promise<Express> { return this._app; }

	/**
	 * Returns the router instance
	 * @returns { Promise<Router> } Router
	 */
	public async getRouter(): Promise<Router> { return this._router; }

	/**
	 * Returns the currently loaded modules
	 * @returns { Promise<RouteModules> } RouteModules
	 */
	public async getModules(): Promise<RouteModules> { return this._modules; }

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