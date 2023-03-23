# Loopware Online Subsystem @ build.py script || Builds and sets up a dev build version of Loss
# Must be executed from top of the project structure | UNIX only lmao
# This is so cursed

import os
import subprocess
from typing import Final

__author__: Final[str] = "https://github.com/The-Glit-ch"
__version__: Final[str] = "1.0.0" 

def main() -> None:
	print(f"Loopware Online Subsystem @ Automated build script | v{__version__}")
	
	# Change to /src
	print("Switching to /src")
	os.chdir("./src")

	# Build project
	print("Building project...")
	try:
		subprocess.run(['tsc'], shell=True, stdout=subprocess.PIPE).check_returncode()
	except subprocess.CalledProcessError as call_error:
		print(f"An error occurred while building | ${call_error}")
	
	# Change to root project dir
	os.chdir("..")

	# Copy .env
	print("Copying external resources")
	_system_copy("./.env", "./src/build")

	# Copy the certs
	_system_copy("./certs", "./src/build")

	# Copy the mega package
	_system_copy("./src/package.json", "./src/build")

	# Change to build dir
	os.chdir("./src/build")

	# Install packages
	print("Installing packages...")
	try:
		subprocess.run(['npm install'], shell=True, stdout=subprocess.PIPE).check_returncode()
	except subprocess.CalledProcessError as call_error:
		print(f"An error occurred while installing | ${call_error}")
	
	# Start running everything on a new terminal (this is very hardcoded)
	print("Running servers")
	subprocess.Popen([f'gnome-terminal -t Loss-Authorization-Server -- sh -c "node {os.getcwd()}/systems/authorization/src/index.js" '], shell=True)
	subprocess.Popen([f'gnome-terminal -t Loss-Datastore-Server -- sh -c "node {os.getcwd()}/systems/datastore/src/index.js" '], shell=True)
	subprocess.Popen([f'gnome-terminal -t Loss-Live-Analytics-Server -- sh -c "node {os.getcwd()}/systems/live/analytics-server/src/index.js" '], shell=True)
	subprocess.Popen([f'gnome-terminal -t Loss-Net-UDP-Holepunch-Server -- sh -c "node {os.getcwd()}/systems/net/udp-holepunch-server/src/index.js" '], shell=True)

def _system_copy(source: str, target: str) -> None:
	subprocess.call(['cp', '-a', source, target])

if __name__ == "__main__":
	main()