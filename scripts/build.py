# Imports
import os
import sys
import subprocess
from typing import Final

# Docstring
# Loopware Online Subsystem @ Build Toolchain
# Robust build toolchain allowing for both builds of a development and production Loss instance
# UNIX systems only

# Enums

# Interfaces

# Classes

# Constants

# Public Variables

# Private Variables

# main()
def main(build_type: str) -> None:
	# Switch to the project dir
	os.chdir(".././src")

	# Build typescript project
	try:
		print("Building project...")
		subprocess.run(['tsc'], stdout=subprocess.PIPE).check_returncode()
		print("Build successful")
	except subprocess.CalledProcessError as call_error:
		print(f"Typescript build error | {call_error}")
		return
	
	# Copy files
	print("Copying required files")
	_unix_copy(".././src/package-lock.json", ".././dist")
	_unix_copy(".././src/package.json", ".././dist")
	_unix_copy(".././env/.env", ".././dist")
	_unix_copy(".././certs/", ".././dist")

	# Switch to dist dir
	os.chdir(".././dist")

	# Install packages
	try:
		print("Installing packages...")
		subprocess.run(['npm', 'ci'], stdout=subprocess.PIPE).check_returncode()
		print("Done installing")
	except subprocess.CalledProcessError as call_error:
		print(f"Error while installing packages | {call_error}")
		return
	
	# Run development build
	print("Running development build...")
	subprocess.run(['export NODE_ENV=development && node .'], shell=True)

# Public Methods

# Private Methods
def _unix_copy(source: str, target: str) -> None:
	subprocess.call(['cp', '-a', source, target])


# Run
if __name__ == "__main__":
	# "dev" for development
	# "prod" for production 
	build_type: Final[str] = sys.argv[1].lower()

	match build_type:
		case "dev":
			print("Preparing for development build")
			main(build_type)
		case "prod":
			print("Preparing for production build")
			main(build_type)