# **Loopware Online Subsystem Server: Space Guard Service**
## ***Authorization Route***

---

### Description:
The **Space Guard: Authorization Route** is the main *"gateway"* between you, as the client, and the Loopware Online Subsystem Server (Loss) instance. Using an OAUTH 2.0 flow, Json Web Tokens (JWT), and role based access the **Space Guard: Authorization Route** is able to provide a secure and manageable way of communicating with Loss

---

### Examples:
#### Register Client
Registers a client with Loss
```http
POST https://localhost.com/space-guard/api/v1/register-client
Authorization: ClientToken
```
```json
{
	"code": 200,
	"message": "Ok",
	"data": {
		"jwtAccessToken": "abc123",
		"jwtRefreshToken": "abc123",
	},
}
```

---

#### Refresh Client
Refreshes a client's access token
```http
POST https://localhost.com/space-guard/api/v1/refresh-client
Authorization: ClientToken:jwtRefreshToken
```
```json
{
	"code": 200,
	"message": "Ok",
	"data": {
		"jwtAccessToken": "abc123",
	},
}
```

---

#### Logout Client
Invalidates a client's access token and refresh token
```http
POST https://localhost.com/space-guard/api/v1/logout-client
Authorization: ClientToken:jwtRefreshToken
```
```json
{
	"code": 200,
	"message": "Ok",
}
```

---

### Diagrams
#### OAUTH 2.0 Flow
This shows an example on how OAUTH 2.0 works in Loss. This does **NOT** show the full scale of the process
```mermaid
sequenceDiagram
	participant client as Client
	participant space_guard as Space Guard
	participant auth_middleware as Authorization Middleware
	participant resource as Resource

	Note right of client: Client sends a registration request
	
	client ->>+ space_guard: Client token
	
	Note left of space_guard: Space Guard validates the client token
	
	space_guard -->>- client: Refresh Token, Access Token
	
	Note over client, auth_middleware: Client sends a request to a secured resource
	
	client ->>+ auth_middleware: Client token, Access Token

	Note left of auth_middleware: Authorization middleware checks with Space Guard

	auth_middleware ->>- resource: Client request

	Note left of resource: Resource server processes the request

	resource -->> client: Data
```
---