# Loopware Online Subsystem @ loss-cli.py script || CLI for interacting with Loss
# Must be ran where the server is running

import json
import argparse
import requests

def create_new_app(app_name: str, port: int = 36210) -> None:
	headers = {'Content-Type': 'application/json'}
	body = json.dumps({ "appName": app_name })
	try:
		r = requests.post(f'https://127.0.0.1:{port}/authorization/_/dashboard/api/v1/new-client', data=body, headers=headers, verify=False)
		returnJSON = r.json()
		statusCode = returnJSON['code']

		if statusCode != 200:
			print(f"Error: {returnJSON['message']}")
			return

		print(f"Client Token: {returnJSON['data']['clientToken']}")
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
		create_new_app(args.new_app, args.port or 36210)

if __name__ == "__main__":
	main()