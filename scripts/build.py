# Loopware Online Subsystem @ build.py script || Automates building a production or developer build of Loss

import os
import subprocess 
from subprocess import PIPE, CalledProcessError
from typing import Final

__author__: Final[str] = "https://github.com/The-Glit-ch"
__version__: Final[str] = "1.0.0" 

# Config
# Must be relative to the root project directory
lossAuthorizationServerDockerfileRelativePath: Final[str] = "./docker/images/loss-authorization-server"
lossDatastoreServerDockerfileRelativePath: Final[str] = "./docker/images/loss-datastore-server"
lossLiveAnalyticsServerDockerfileRelativePath: Final[str] = "./docker/images/loss-live-analytics-server"
lossNetUDPPunchthroughServerDockerfileRelativePath: Final[str] = "./docker/images/loss-net-udp-punchthrough-server"

def main(buildType: int) -> None:
	print(f"Loopware Online Subsystem @ Automated dev/prod build script | v{__version__}")

	# Change to /src directory
	os.chdir('./src')

	# Build project
	print("Building project")
	try:
		subprocess.run(['tsc'], stdout=PIPE).check_returncode()
	except CalledProcessError as call_error:
		print(f"An error occurred while building | {call_error}")
	print("Build successful")

	# Change to root directory
	os.chdir('..')

	# Copy external files
	print("Copying external resources")
	_system_copy('./.env', './src/build')
	_system_copy('./certs', './src/build')
	_system_copy('./src/package.json', './src/build')

	# Change to build directory
	os.chdir('./src/build')

	# Make the stream directory
	subprocess.run(['mkdir', 'stream'])

	# Install packages
	print("Installing packages...")
	try:
		subprocess.run(['npm', 'install'], stdout=PIPE).check_returncode()
	except CalledProcessError as call_error:
		print(f"An error occurred while installing packages | {call_error}")
	print("Done installing")

	# Are we just building for development?
	if (buildType == 1): return

	# Change to root directory
	os.chdir('../../')

	# Copy the build folder to the dockerfile location
	print("Preparing for dockerfile build")
	_system_copy('./src/build', lossAuthorizationServerDockerfileRelativePath)
	_system_copy('./src/build', lossDatastoreServerDockerfileRelativePath)
	_system_copy('./src/build', lossLiveAnalyticsServerDockerfileRelativePath)
	_system_copy('./src/build', lossNetUDPPunchthroughServerDockerfileRelativePath)

	# Change to the docker images locations and run the docker files
	print("Building images...")
	os.chdir('./docker/images/loss-authorization-server')
	subprocess.run(['docker', 'build', '-t', 'loss-authorization-server', '.'])
	os.chdir('../loss-datastore-server')
	subprocess.run(['docker', 'build', '-t', 'loss-datastore-server', '.'])
	os.chdir('../loss-live-analytics-server')
	subprocess.run(['docker', 'build', '-t', 'loss-live-analytics-server', '.'])
	os.chdir('../loss-net-udp-punchthrough-server')
	subprocess.run(['docker', 'build', '-t', 'loss-net-udp-punchthrough-server', '.'])

	# Change to root directory
	os.chdir('../../../')

	# Clean up
	print("Cleaning up")
	subprocess.run(['rm', '-rf', './src/build'])
	subprocess.run(['rm', '-rf', f'{lossAuthorizationServerDockerfileRelativePath}/build'])
	subprocess.run(['rm', '-rf', f'{lossDatastoreServerDockerfileRelativePath}/build'])
	subprocess.run(['rm', '-rf', f'{lossLiveAnalyticsServerDockerfileRelativePath}/build'])
	subprocess.run(['rm', '-rf', f'{lossNetUDPPunchthroughServerDockerfileRelativePath}/build'])

	# Exit
	print("Done!")
	return

def _system_copy(source: str, target: str) -> None:
	subprocess.call(['cp', '-a', source, target])

if __name__ == "__main__":
	buildType = int(input("Build Type\n[1] Developer\n[2] Production\n:"))
	main(buildType)