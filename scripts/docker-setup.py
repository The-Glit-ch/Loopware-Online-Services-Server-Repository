# Loopware Online Subsystem @ docker-setup.py || Automatically sets up your docker containers
# UNIX only
# This is so fucking cursed I cant
# TODO: IMPROVE A LOT OF THE BUILD/SETUP PROCESS

import subprocess
from subprocess import Popen
from typing import Final

__version__: Final[str] = "1.0.0"
__author__: Final[str] = "https://github.com/The-Glit-ch"

# Configuration
authorizationAdminUser: Final[str] = "lossAuthorizationMongoDB"
authorizationAdminPassword: Final[str] = "lossAuthorizationMongoDB"
authorizationListeningPort: Final[int] = 36200
authorizationContainerID: Final[str] = ""

datastoreAdminUser: Final[str] = "lossDatastoreMongoDB"
datastoreAdminPassword: Final[str] = "lossDatastoreMongoDB"
datastoreListeningPort: Final[int] = 36201
datastoreContainerID: Final[str] = ""

# Authorization
authorizationClientTokenStorageUser: Final[str] = "clientTokenStorageAgent"
authorizationClientTokenStoragePassword: Final[str] = "clientTokenStorageAgent"
authorizationLiveTokenStorageUser: Final[str] = "liveTokenStorageAgent"
authorizationLiveTokenStoragePassword: Final[str] = "liveTokenStorageAgent"

# Datastore
datastoreDatastoreStorageUser: Final[str] = "datastoreStorageAgent"
datastoreDatastoreStoragePassword: Final[str] = "datastoreStorageAgent"
datastoreLeaderboardStorageUser: Final[str] = "leaderboardStorageAgent"
datastoreLeaderboardStoragePassword: Final[str] = "leaderboardStorageAgent"


def main() -> None:
	# Setup the authorization server
	print("Setting up the authorization database")
	
	# Open and connect a new mongosh instance
	print("Opening a connection to the authorization database")
	try:
		clientTokenStorageCreateUserCommand: str = 'db.createUser({{ user: "{user}", pwd: "{pwd}", roles: [{{ role: "readWrite", db: "clientTokenStorage", }}] }})'.format(user=authorizationClientTokenStorageUser, pwd=authorizationClientTokenStoragePassword)
		liveTokenStorageCreateUserCommand: str = 'db.createUser({{ user: "{user}", pwd: "{pwd}", roles: [{{ role: "readWrite", db: "liveTokenStorage", }}] }})'.format(user=authorizationLiveTokenStorageUser, pwd=authorizationLiveTokenStoragePassword)
		authorizationConnectionURI: str = f'mongodb://{authorizationAdminUser}:{authorizationAdminPassword}@127.0.0.1:{authorizationListeningPort}/admin'
		authorizationDatabase = Popen(['docker', 'exec', '-i', authorizationContainerID, 'mongosh', '--eval', '"use clientTokenStorage"', '--eval', f'"{clientTokenStorageCreateUserCommand}"', '--eval', '"use liveTokenStorage"', '--eval', f'"{liveTokenStorageCreateUserCommand}"', authorizationConnectionURI], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
		authorizationDatabase.wait()
	except Exception as call_error:
		print(f"Error occurred | {call_error}")
	
	# Exit
	print("Authorization setup done")

	# Setup the datastore server
	print("Setting up the datastore database")

	# Open and connect a new mongosh instance
	print("Opening a connection to the datastore database")
	try:
		datastoreStorageCreateUserCommand: str = 'db.createUser({{ user: "{user}", pwd: "{pwd}", roles: [{{ role: "readWrite", db: "datastoreStorage", }}] }})'.format(user=datastoreDatastoreStorageUser, pwd=datastoreDatastoreStoragePassword)
		leaderboardStorageCreateUserCommand: str = 'db.createUser({{ user: "{user}", pwd: "{pwd}", roles: [{{ role: "readWrite", db: "leaderboardStorage", }}] }})'.format(user=datastoreLeaderboardStorageUser, pwd=datastoreLeaderboardStoragePassword)
		datastoreConnectionURI: str = f'mongodb://{datastoreAdminUser}:{datastoreAdminPassword}@127.0.0.1:{datastoreListeningPort}/admin'
		datastoreDatabase = Popen(['docker', 'exec', '-i', datastoreContainerID, 'mongosh', '--eval', '"use datastoreStorage"', '--eval', f'"{datastoreStorageCreateUserCommand}"', '--eval', '"use leaderboardStorage"', '--eval', f'"{leaderboardStorageCreateUserCommand}"', datastoreConnectionURI], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
		datastoreDatabase.wait()
	except Exception as call_error:
		print(f"Error occurred | {call_error}")

	# Exit
	print("Datastore setup done")

if __name__ == "__main__":
	main()