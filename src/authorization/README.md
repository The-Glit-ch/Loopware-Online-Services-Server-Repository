# Loopware Online Subsystem - Authorization Server
Contains HTTP(S) endpoints for handling user/server authentication

# Server Endpoints
## (POST) || /auth/server/register
Endpoint for registering game/app. Client ID must be passed in the Authorization header

```rest
POST http://localhost:8080/auth/server/register
Authorization: Bearer MY_CLIENT_ID
```

---

## (POST) || /auth/server/refresh
Endpoint for refreshing access token. Refresh token must be passed in the Authorization header

```rest
POST http://localhost:8080/auth/server/refresh
Authorization: Bearer MY_REFRESH_TOKEN
```

---

## (POST) || /auth/server/logout
Endpoint for logging out/invalidating access + refresh token. Refresh token must be passed in the Authorization header

```rest
POST http://localhost:8080/auth/server/logout
Authorization: Bearer MY_REFRESH_TOKEN
```