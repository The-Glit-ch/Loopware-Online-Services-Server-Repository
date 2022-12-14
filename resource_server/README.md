# Loopware Online Subsystem - Resource Server
Contains HTTP(S) endpoints for handling database reading/writing.

# Data-store Endpoints
## (GET) || /rs/datastore/fetch-data
Endpoint for fetching data from the database. If ``authorization`` is enabled then access token from the ``Authorization Server`` must be provided in the ``Authorization`` header

```rest
GET http://127.0.0.1:8080/rs/datastore/fetch-data
Content-Type: application/json
Authorization: Bearer $TOKEN

{
	"dbName": "example-db",
	"dbQuery": {"dbID": "ID"}
}
```
---
## (POST) || /datastore/create-new
Endpoint for creating a new collection and populating it with data. If ``authorization`` is enabled then access token from the ``Authorization Server`` must be provided in the ``Authorization`` header

```rest
POST http://127.0.0.1:8080/rs/datastore/create-new
Content-Type: application/json
Authorization: Bearer $TOKEN

{
	"dbName": "example-db",
	"dbData": {
		"dbID": "ID",
		"dbKey": "dbValue",
		"dbArray": ["index-0", "index-1"]
	}
}
```
---
## (PUT) || /datastore/edit-data
Endpoint for update and replacing data in the database. If ``authorization`` is enabled then access token from the ``Authorization Server`` must be provided in the ``Authorization`` header

```rest
PUT http://127.0.0.1:8080/rs/datastore/edit-data
Content-Type: application/json
Authorization: Bearer $TOKEN

{
	"dbEditMode": "update",
	"dbName": "example-db",
	"dbData": {"$set": {"dbKey": "updated-dbKey"}},
	"dbQuery": {"dbID": "ID"}
}
```
---
```rest
PUT http://127.0.0.1:8080/rs/datastore/edit-data
Content-Type: application/json
Authorization: Bearer $TOKEN

{
	"dbEditMode": "replace",
	"dbName": "example-db",
	"dbData": {
		"dbID": "NewID", 
		"dbMessage": "Entire document replaced!"
	},
	"dbQuery": {"dbID": "ID"}
}
```