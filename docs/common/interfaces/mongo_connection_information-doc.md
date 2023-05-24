# **Loopware Online Subsystem Server: Common/Interfaces**
## ***Mongo Connection Information Interface***

---

### Description:
The **Mongo Connection Information** interface provides basic information about a database at runtime

---

### Examples:
#### Retrieving Mongo Client
```typescript
const myConnectionInformation: MongoConnectionInformation = connectionInfo
const mongoClient: MongoClient = myConnectionInformation.client
```

---

#### Retrieving Database Name
```typescript
const myConnectionInformation: MongoConnectionInformation = connectionInfo
const databaseName: String = myConnectionInformation.databaseName
```

---

#### Retrieving Connection Status
```typescript
const myConnectionInformation: MongoConnectionInformation = connectionInfo
const isConnected: Boolean = myConnectionInformation.isConnected
```

---

### Properties and Definitions:
```typescript
interface MongoConnectionInformation {
	client: MongoClient,
	databaseName: string,
	isConnected: boolean,
}
```
---