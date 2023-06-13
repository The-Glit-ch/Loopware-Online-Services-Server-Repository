# Imports
import os
import sys
import subprocess
from typing import Final

# Docstring
# Loopware Online Subsystem Server @ Build Script
# Robust build toolchain allowing for both builds of a development and production Loss instance (UNIX systems only)

# Enums

# Interfaces

# Classes

# Constants

# Public Variables

# Private Variables

# main()
def main(build_type: str) -> None:
	# Check the build type
	match build_type:
		case "dev":
			print("Building Loss@Development")
		case "prod":
			print("Building Loss@Production")
		case _:
			print("Invalid build type")
			return
		
	# Remove the old build
	_unix_remove("./dist")
	
	# Switch to the project directory
	os.chdir("./src")

	# Build project
	try:
		print("Building project...")
		subprocess.run(['tsc'], stdout=subprocess.PIPE).check_returncode()
		print("Build successful")
	except subprocess.CalledProcessError as call_error:
		print(f"Typescript build error | {call_error}")
		return
	
	# Copy files
	print("Copying required files")
	_unix_copy("./package-lock.json", ".././dist")
	_unix_copy("./package.json", ".././dist")

	# Switch to dist directory
	os.chdir(".././dist")

	# Install packages
	try:
		print("Installing packages...")
		subprocess.run(['npm', 'ci'], stdout=subprocess.PIPE).check_returncode()
		print("Done installing")
	except subprocess.CalledProcessError as call_error:
		print(f"Error while installing packages | {call_error}")
		return
	
	# Build type check
	if build_type == "dev":
		print("Running development build")
		subprocess.run(['export NODE_ENV=development && node .'], shell=True)

# Public Methods

# Private Methods
def _unix_copy(source: str, target: str) -> None:
	subprocess.call(['cp', '-a', source, target])

def _unix_remove(file_path: str) -> None:
	subprocess.call(['rm', '-rf', file_path])

# Run
if __name__ == "__main__":
    # Get the requested build type
	build_type: Final[str] = sys.argv[1].lower()
	main(build_type)