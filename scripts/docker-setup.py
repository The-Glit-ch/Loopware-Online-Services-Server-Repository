# Imports
import subprocess
from subprocess import PIPE
from typing import Final

# Docstring
# Loopware Online Subsystem @ Automated Docker setup script
# Automates the setup of databases

# Classes

# Enums

# Interface

# Constants
SETUP_INFO: Final[dict] = {
	clientTokenStorage: { user: "clientTokenStorageAgent", pwd: "clientTokenStorageAgent", db: "clientTokenStorage"},
	liveTokenStorage: { user: "liveTokenStorageAgent", pwd: "liveTokenStorageAgent", db: "liveTokenStorage"},
	datastoreStorage: { user: "datastoreStorageAgent", pwd: "datastoreStorageAgent", db: "datastoreStorage"},
	leaderboardStorage: { user: "leaderboardStorageAgent", pwd: "leaderboardStorageAgent", db: "leaderboardStorage"},
}
AUTHORIZATION_CONTAINER_ID: Final[str] = ""
DATASTORE_CONTAINER_ID: Final[str] = ""
CREATE_USER_COMMAND_TEMPLATE: Final[str] = 'db.createUser({{ user: "{user}", pwd: "{pwd}", roles: [{{ role: "readWrite", db: "{db}", }}] }})'

# ENV Constants

# Public Variables

# Private Variables
__author__: Final[str] = "https://github.com/The-Glit-ch"
__version__: Final[str] = "PRE-1.0.0"

# main()
def main() -> None:
	# Setup the authorization database
	print("Setting up the authorization database...")

	# Funky stuff going on here
	try:
		clientTokenStorageCreateUserCommand: str = CREATE_USER_COMMAND_TEMPLATE.format(user=SETUP_INFO.clientTokenStorage.user, pwd=SETUP_INFO.clientTokenStorage.pwd, db=SETUP_INFO.clientTokenStorage.db)
		liveTokenStorageCreateUserCommand: str = CREATE_USER_COMMAND_TEMPLATE.format(user=SETUP_INFO.liveTokenStorage.user, pwd=SETUP_INFO.liveTokenStorage.pwd, db=SETUP_INFO.liveTokenStorage.db)
		authorizationDatabase: str = subprocess.run(['docker', 'exec', '-i', ''])
	except Exception as call_error:
		pass


# Public Methods

# Private Methods

# Callbacks

# Run
if __name__ == "__main__":
	print(f"Loopware Online Subsystem @ Automated Docker setup script | Version {__version__}")
	main()