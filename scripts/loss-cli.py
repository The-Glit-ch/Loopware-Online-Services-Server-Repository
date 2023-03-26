# Loopware Online Subsystem @ loss-cli.py script || CLI for interacting with Loss
# Must be ran where the server is running

import json
import time
import argparse
import requests


def create_new_app(app_name: str, port: int) -> None:
	try:
		# Prepare payload
		requestHeaders = {'Content-Type': 'application/json'}
		requestBody = json.dumps({ "appName": app_name, "accessScopes": { "datastore": True, "net": True, } })
		
		# Send request
		response = requests.post(f'https://127.0.0.1:{port}/config/api/v1/authorization/new-client', data=requestBody, headers=requestHeaders, verify=False)
		
		# Wait for response
		while not response.json():
			time.sleep(1)
		
		# Retrieve response information
		responseJSON = response.json()
		responseMessage = responseJSON['message']
		responseCode = responseJSON['code']
		responseData = responseJSON['data']

		# Error handling
		if responseCode != 200:
			print(f"Request error: {responseMessage} | Code: {responseCode}")
			return
		
		print(f"Client Token: {responseData['clientToken']}")
		return
	except Exception as request_error:
		print(f"Critical error: {request_error}")
		return

def main() -> None:
	# Create the parser object
	parser = argparse.ArgumentParser(description="Loopware Online Subsystem @ CLI Tool")

	# Add arguments
	parser.add_argument("-p", "--port", nargs = 1, metavar = "port", type = str, help = "The port to communicate on")
	parser.add_argument("--new_app", nargs = 1, metavar = "app_name", type = str, help = "Creates and returns a new client token")

	args = parser.parse_args()

	if args.new_app != None:
		create_new_app(args.new_app[0], args.port or 36213)

if __name__ == "__main__":
	main()