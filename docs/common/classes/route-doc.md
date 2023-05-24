# **Loopware Online Subsystem Server: Common/Classes**
## ***Route Class***

---

### Description:
The **Route** class provides generic boilerplate functionality for setting up and configuring routes and endpoints in Loss. Each route is instanced with a reference to the main Express app along with the currently loaded route modules. This allows for the sharing of already instanced classes and modules reducing overall memory usage.

---

### Examples:
#### Instancing a New Route
```typescript
const myNewRoute: Route = await Route.init(expressApp, loadedRouteModules)
``` 

---

#### Creating an Endpoint
```typescript
/**
 * endpoint.ts
 * Endpoint logic
 */

// Private Variables
let _lossLoggingModule: LossLoggingModule

// Public Methods
async function myEndpointHandler(req: Request, res: Response): Promise<void> {
	// Log
	_lossLoggingModule.log("We got a hit!!")

	// Send response
	res.status(200).json({ "hello": "world", })
} 

// Run
module.exports.init = async function(expressApp: Express, loadedRouteModules: RouteModules): Promise<Router> {
	// Create a new route instance
	const myNewEndpoint: Route = await Route.init(expressApp, loadedRouteModules)

	// Get references
	const router: Router = await myNewEndpoint.getRouter()
	const modules: RouteModules = await myNewEndpoint.getModules()

	// Set local variables
	_lossLoggingModule = modules.lossLoggingModule

	// Return router
	return router
}
```

---

#### Using an Endpoint in a Route
```typescript
/**
 * route.ts
 * Route logic
 */

module.exports.init = async function(expressApp: Express, loadedRouteModules: RouteModules): Promise<Router> {
	// Create a new route instance
	const myRoute: Route = await Route.init(expressApp, loadedRouteModules)

	// Instance the endpoint
	const myNewEndpoint: Router = await require('./path/to/endpoint').init(expressApp, loadedRouteModules)

	// Get references
	const router: Router = await myNewEndpoint.getRouter()

	// Return router
	return router
}
```

---

### Properties and Definitions:
```typescript
interface RouteModules {
	lossLoggingModule: LossLoggingModule,
	lossUtilityModule: LossUtilityModule,
	lossSecurityModule: LossSecurityModule,
}
```
```typescript
class Route {
	/**
	 * Instances a new Route class
	 * @param { Express } expressApp - The Express app reference
	 * @param { RouteModules } loadedRouteModules - The loaded route modules
	 * @returns { Promise<Route> } Route
	 */
	init(expressApp: Express, loadedRouteModules: RouteModules): Promise<Route>

	/**
	 * Returns the Express app reference
	 * @returns { Promise<Express> } Express app
	 */
	getApp()

	/**
	 * Returns the Express router class
	 * @returns { Promise<Router> } Express router 
	 */
	getRouter()

	/**
	 * Returns the loaded route modules
	 * @returns { Promise<RouteModules> } Route modules
	 */
	getModules()
}
```
---

