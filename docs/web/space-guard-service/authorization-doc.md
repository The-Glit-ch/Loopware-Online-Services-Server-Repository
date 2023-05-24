# **Loopware Online Subsystem Server: Space Guard Service**
## ***Authorization Route***

---

### Description:
The **Space Guard Authorization Route** is the main *"gateway"* between you, as the client, and the Loopware Online Subsystem Server (Loss) instance. Using an OAUTH 2.0 flow along with Json Web Tokens (JWT's) the **Space Guard Authorization Route** is able to provide a secure and manageable way of communicating with Loss

---

### Diagrams:
#### OAUTH 2.0 Flow
A simple overview on how OAUTH 2.0 is done in Loss
```mermaid
sequenceDiagram
	participant client as Client
	participant space_guard as Space Guard: Authorization Route
	participant authorization_middleware as Authorization Middleware
	participant private_service as Loss Service

	Note right of client: Requests authorization
	client ->>+ space_guard: Client token
	Note left of space_guard: Validates client token
	alt Valid Client Token
		space_guard -->>- client: jwtAccessToken, jwtRefreshToken
		Note right of client: Requests data with access token
		client ->>+ authorization_middleware: /my-endpoint
		client ->> authorization_middleware: Client token, jwtAccessToken
		Note left of authorization_middleware: Validates client token and access token
		alt Valid Client Token and Access Token
			authorization_middleware ->>- private_service: Client request
			activate private_service
			Note left of private_service: Process request
			private_service -->> client: Data
			deactivate private_service
		else Invalid Client Token and Access Token
			authorization_middleware --x client: 401: Unauthorized, Invalid token(s)
		end
	else Invalid Client Token
		space_guard --x client: 401: Unauthorized, Invalid client token
	end
```

---

### Examples:
#### Register Client
Registers a client with Loss
```http
POST https://localhost.com/space-guard/api/v1/register-client
Authorization: ClientToken
```

---

#### Refresh Client
Refreshes a client's access token
```http
POST https://localhost.com/space-guard/api/v1/refresh-client
Authorization: ClientToken:jwtRefreshToken
```

---

#### Logout Client
Invalidates a client's access token and refresh token
```http
POST https://localhost.com/space-guard/api/v1/logout-client
Authorization: ClientToken:jwtRefreshToken
```

---