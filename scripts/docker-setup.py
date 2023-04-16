# Imports
import subprocess
from subprocess import CalledProcessError
from typing import Final

# Docstring
# Loopware Online Subsystem @ Automated Docker setup script
# Automates the setup of databases || Better than the previous version to be honest

# Classes

# Enums

# Interface

# Constants
AUTHORIZATION_DATABASE_CONTAINER_ID: Final[str] = ""
AUTHORIZATION_DATABASE_CONNECTION_INFO: Final[list] = ["user", "password", "port"]
DATASTORE_DATABASE_CONTAINER_ID: Final[str] = ""
DATASTORE_DATABASE_CONNECTION_INFO: Final[list] = ["user", "password", "port"]
USER_SETUP_INFO: Final[dict] = {
	"clientTokenStorageUser": ["user", "password", "database"],
	"liveTokenStorageUser": ["user", "password", "database"],
	"datastoreStorageUser": ["user", "password", "database"],
	"leaderboardStorageUser": ["user", "password", "database"],
}
CREATE_USER_COMMAND_TEMPLATE: Final[str] = 'db.createUser({{ user: "{user}", pwd: "{pwd}", roles: [{{ role: "readWrite", db: "{db}", }}], }})'
MONGOSH_CONNECTION_URI_TEMPLATE: Final[str] = 'mongodb://{user}:{pwd}@127.0.0.1:{port}/admin'

# ENV Constants

# Public Variables

# Private Variables
__author__: Final[str] = "https://github.com/The-Glit-ch"
__version__: Final[str] = "PRE-1.0.0"

# main()
def main() -> None:
	# Setup the authorization database
	print("Setting up the authorization database...")

	try:
		clientTokenStorageCreateUserCommand: str = CREATE_USER_COMMAND_TEMPLATE.format(user=USER_SETUP_INFO["clientTokenStorageUser"][0], pwd=USER_SETUP_INFO["clientTokenStorageUser"][1], db=USER_SETUP_INFO["clientTokenStorageUser"][2])
		liveTokenStorageCreateUserCommand: str = CREATE_USER_COMMAND_TEMPLATE.format(user=USER_SETUP_INFO["liveTokenStorageUser"][0], pwd=USER_SETUP_INFO["liveTokenStorageUser"][1], db=USER_SETUP_INFO["liveTokenStorageUser"][2])
		authorizationDatabaseConnectionURI: str = MONGOSH_CONNECTION_URI_TEMPLATE.format(user=AUTHORIZATION_DATABASE_CONNECTION_INFO[0], pwd=AUTHORIZATION_DATABASE_CONNECTION_INFO[1], port=AUTHORIZATION_DATABASE_CONNECTION_INFO[2])
		createClientTokenStorageUserCommand: list = f'docker_exec_-i_{AUTHORIZATION_DATABASE_CONTAINER_ID}_mongosh_--eval_"use {USER_SETUP_INFO["clientTokenStorageUser"][2]}"_--eval_"{clientTokenStorageCreateUserCommand}"_{authorizationDatabaseConnectionURI}'.split('_')
		createLiveTokenStorageUserCommand: list = f'docker_exec_-i_{AUTHORIZATION_DATABASE_CONTAINER_ID}_mongosh_--eval_"use {USER_SETUP_INFO["liveTokenStorageUser"][2]}"_--eval_"{liveTokenStorageCreateUserCommand}"_{authorizationDatabaseConnectionURI}'.split('_')
		subprocess.Popen(createClientTokenStorageUserCommand, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE).wait()
		subprocess.Popen(createLiveTokenStorageUserCommand, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE).wait()
	except CalledProcessError as call_error:
		print("An error occurred: ", call_error)
		return
	print("Done!")
	return
	# Setup the datastore database


# Public Methods

# Private Methods

# Callbacks

# Run
if __name__ == "__main__":
	print(f"Loopware Online Subsystem @ Automated Docker setup script | Version {__version__}")
	main()