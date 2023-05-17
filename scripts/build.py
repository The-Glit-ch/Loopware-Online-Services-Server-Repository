# Imports
import os, subprocess
from subprocess import PIPE, CalledProcessError
from typing import Final

# Docstring
# Loopware Online Subsystem @ Automated build script
# Automates the process of building and running Loss locally

# Classes

# Enums

# Interface

# Constants
__author__: Final[str] = "https://github.com/The-Glit-ch"
__version__: Final[str] = "PRE-1.0.0" 

# ENV Constants

# Public Variables

# Private Variables

# main()
def main() -> None:
	# Change to ./src directory
	os.chdir("./src")

	# Build project
	print("Building project...")
	try:
		subprocess.run(['tsc'], stdout=PIPE).check_returncode()
	except CalledProcessError as call_error:
		print(f"An error occurred while building the project | {call_error}")
		return
	print("Build successful")

	# Change to root project directory
	os.chdir("..")

	# Copy external files
	print("Copying required files")
	_system_copy("./src/package-lock.json", "./build")
	_system_copy("./src/package.json", "./build")
	_system_copy("./env/.env", "./build")
	_system_copy("./certs/", "./build")

	# Change to the build directory
	os.chdir("./build")

	# Install packages
	print("Installing packages...")
	try:
		subprocess.run(['npm', 'ci'], stdout=PIPE).check_returncode()
	except CalledProcessError as call_error:
		print(f"An error occurred while installing packages | {call_error}")
		return
	print("Done installing")

	# Run build
	print("Running build")
	subprocess.run(['export NODE_ENV=development && node ./web/index.js'], shell=True)

# Public Methods

# Private Methods
def _system_copy(source: str, target: str) -> None:
	subprocess.call(['cp', '-a', source, target])

# Callbacks

# Run
if __name__ == "__main__":
	print(f"Loopware Online Subsystem @ Automated build script | Version {__version__}")
	main()