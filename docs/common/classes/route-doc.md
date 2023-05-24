# **Loopware Online Subsystem Server: Common/Classes**
## ***Route Class***

---

### Description:
The **Route** class provides generic boiler plate code for setting up and configuring routes and endpoints in Loss. Each route is instanced with a reference to the main express app along with the loaded route modules. This allows for the sharing of already instanced modules minimizing memory usage

---

### Examples:

#### Creating a new route:

```typescript
/**
 * myEndpoint.ts
 * Endpoint code
 */

// Private Variables
let _loggingModule: LossLoggingModule

// Public endpoints
function myEndpointHandler(request: Request, response: Response): Promise<void> {
	res.status(200).json({ "data": "data", })
	return
}

// Init
module.exports.init = async function (expressApp: Express, loadedRouteModules: RouteModules): Promise<Router> {
	// Create a new route instance
	const myNewEndpoint: Route = await Route.init(expressApp, loadedRouteModules)

	// Get references for future use
	const router: Router = await myNewEndpoint.getRouter()
	const modules: RouteModules = await myNewEndpoint.getModules()

	// Setup endpoints
	myNewEndpoint.get("/my-endpoint", myEndPointHandler)

	// Return router 
	return router
}


/**
 * main.ts
 * Main server code
 */
const myRoute: Router = await require('./my/path/to/route').init(myExpressApp, myRouteModules)
app.use("/my-route/to/endpoint/", myRoute)

//continue with server code..
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
	 * Returns the Express Router class
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

