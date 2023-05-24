# **Loopware Online Subsystem Server: Space Guard Service**
## ***Authorization Route***

---

### Description:
The Space Guard authorization endpoint is the main *"gateway"* between you, as the client, and the Loopware Online Subsystem Server (Loss) instance. Using an OAUTH 2.0 flow along with JsonWebTokens (JWT's) the Space Guard service is able to provide a secure and manageable way of communication with Loss

---

### Examples:

#### OAUTH 2.0 Flow Example

```mermaid
sequenceDiagram
	participant client as Client
	participant space_guard as Space Guard
	participant auth_middleware as Authorization Middleware
	participant server_resource as Cosmic Storage

	Note over client,server_resource: *This is only an example and does not represent the full extent*

	client->>+space_guard: POST /register-client
	client->>+space_guard: Authorization: Bearer: ClientToken
	
	alt Invalid Client Token
		space_guard->>client: Response: 401
	else Valid Client Token
		space_guard->>client: Response: 200
		space_guard->>client: JWTAccessToken, JWTRefreshToken

		client->>+auth_middleware: POST /write-data
		client->>+auth_middleware: Authorization: Bearer: ClientToken:JWTAccessToken

		alt Expired Access Token
			auth_middleware->>client: Response: 401
			client->>+space_guard: POST /refresh-client
			client->>+space_guard: Authorization: Bearer: ClientToken:JWtRefreshToken
			auth_middleware->>client: JWTAccessToken
		else Valid Access Token
			auth_middleware->>server_resource: Client request data
			server_resource->>client: Server response data
		end
	end
```

---

### Endpoints


```http
# /register-client | Registers the client with Loss: Space Guard Service

#<-->#

POST https://localhost:8080/space-guard/api/v1/register-client
Authorization: Bearer: ClientToken

#<-->#

Returns: { "code": ResponseCode, "message": ServerMessage, data: { "jwtAccessToken": Token, "jwtRefreshToken": Token, }, }
```

---

```http
# /refresh-client | Refreshes the client access token

#<-->#

POST https://localhost:8080/space-guard/api/v1/refresh-client
Authorization: Bearer: ClientToken:jwtRefreshToken

#<-->#

Returns: { "code": ResponseCode, "message": ServerMessage, data: { "jwtAccessToken": Token, }, }
```

---

```http
# /logout-client | Invalidates the refresh and access token essentially "logging out" from Loss services

#<-->#

POST https://localhost:8080/space-guard/api/v1/logout-client
Authorization: Bearer: ClientToken:jwtRefreshToken

#<-->#

Returns: { "code": ResponseCode, "message": ServerMessage, }
```

---