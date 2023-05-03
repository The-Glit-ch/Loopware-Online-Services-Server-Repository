# Imports
import subprocess
from typing import Final

# Docstring

# Enums

# Interfaces

# Classes

# Constants
CREATE_USER_TEMPLATE: Final[str] = 'db.createUser({{ user: "{user}", pwd: "{pwd}", roles: [{{ role: "readWrite", db: "{db}", }}], }})'
URL_TEMPLATE: Final[str] = 'mongodb://{user}:{pwd}@127.0.0.1:{port}/admin'

# Public Variables

# Private Variables
__author__: Final[str] = "https://github.com/The-Glit-ch"
__version__: Final[str] = "PRE-1.0.0"

# _init()
def main() -> None:
	# Setup the space guard database
	print("Setting up the space guard database")

	try:
		clientTokenStorageCreateUserCommand: str = CREATE_USER_TEMPLATE.format(user="", pwd="", db="")
		liveTokenStorageCreateUserCommand: str = CREATE_USER_TEMPLATE.format(user="", pwd="", db="")
		spaceGuardConnectionURL: str = URL_TEMPLATE.format(user="", pwd="", port="")
		cmd: str = ['docker', 'exec', '-i', '{container_id}', 'mongosh', '--eval', '"use {db}"', '--eval', f'"{clientTokenStorageCreateUserCommand}"', '--eval', '"use {db}"', '--eval', f'"{liveTokenStorageCreateUserCommand}"', spaceGuardConnectionURL]
		subprocess.Popen(cmd, stdin=subprocess.PIPE).wait()
	except subprocess.CalledProcessError as call_error:
		print("An error occurred: ", call_error)
		return

	print("Done")
	# Setup the cosmic storage database
	print("Setting up the cosmic storage database")

	try:
		datastoreStorageCreateUserCommand: str = CREATE_USER_TEMPLATE.format(user="", pwd="", db="")
		leaderboardStorageCreateUserCommand: str = CREATE_USER_TEMPLATE.format(user="", pwd="", db="")
		cosmicStorageConnectionURL: str = URL_TEMPLATE.format(user="", pwd="", port="")
		cmd: str = ['docker', 'exec', '-i', '{container_id}', 'mongosh', '--eval', '"use {db}"', '--eval', f'"{datastoreStorageCreateUserCommand}"', '--eval', '"use {db}"', '--eval', f'"{leaderboardStorageCreateUserCommand}"', cosmicStorageConnectionURL]
		subprocess.Popen(cmd, stdin=subprocess.PIPE).wait()
	except subprocess.CalledProcessError as call_error:
		print("An error occurred: ", call_error)
		return
	
	print("Done!")

# Public Methods

# Private Methods

# Run
if __name__ == "__main__":
	print(f"Loopware Online Subsystem @ Automated Docker setup script | Version {__version__}")
	main()