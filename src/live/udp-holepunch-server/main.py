# Imports
import socket
from os import path, getcwd, environ
from typing import Final
from dotenv import load_dotenv
from json import dumps, loads
from modules.logging_module import log
from modules.utils_module import generateNewBindCode
load_dotenv(path.join(getcwd(), ".env/.live-udp-config.env"))

# Docstring
# /**
# * Loopware Online Subsystem @ UDP Hole Punch Server || https://en.wikipedia.org/wiki/UDP_hole_punching
# */

# Enums

# Constants
LOCAL_IP: Final[str] = "127.0.0.1" 
LOCAL_PORT: Final[int] = int(environ["PORT"])
BUFFER_SIZE: Final[int] = 1024

# Public Variables

# Private Variables
# TODO: Find a better way of doing this shit
_connectedClients: list = []
_hostingClients: dict = {}

# _init()
def _init() -> None:
	# Create a new UDP Socket
	UDPServerSocket = socket.socket(family=socket.AF_INET, type=socket.SOCK_DGRAM)
	log("Creating UDP socket")
	
	# Bind the socket
	UDPServerSocket.bind((LOCAL_IP, LOCAL_PORT))
	log(f"UDP \"TURN\" Server started on port {LOCAL_PORT}")

	# Keep polling data
	while True:
		incomingData = UDPServerSocket.recvfrom(BUFFER_SIZE)

		if incomingData:
			# Message is byte values, Address is (IP, PORT)
			incomingMessage, incomingAddr = loads(incomingData[0].decode('utf-8')), incomingData[1]

			if incomingMessage["connectionType"] == "Registration":
				if incomingAddr not in _connectedClients:
					log(f"Registering new client || {incomingAddr[0]}:{incomingAddr[1]}")
					
					# Add client to connected clients list and send back a response
					_connectedClients.append(incomingAddr)
					UDPServerSocket.sendto(dumps({"message": "Connected", "hostCode": ""}).encode('utf-8'), incomingAddr)

					log("New client has been registered")
					continue
				else:
					UDPServerSocket.sendto(dumps({"message": "Already connected"}).encode('utf-8'), incomingAddr)
					continue
			
			
			if incomingMessage["connectionType"] == "Host":
				# Check for registration
				if incomingAddr not in _connectedClients:
					returnData: bytes = returnEncodedMessage({"code": 401, "message": "Not registered with UDP Server"})
					UDPServerSocket.sendto(returnData, incomingAddr)
				
				log("Attempting to create new hosting session for client")
				newBindCode: str = generateNewBindCode()



				returnData: bytes = returnEncodedMessage({"code": 200, "data": newBindCode})
				_hostingClients[incomingAddr] = newBindCode
				

			if incomingMessage["connectionType"] == "Bind":
				bindingRemoteAddr = incomingMessage["remoteBind"]
				print(bindingRemoteAddr)


# Public Methods

# Private Methods
def returnEncodedMessage(data: dict) -> bytes:
	return dumps(data).encode('utf-8')

# Run
if __name__ == "__main__":
	_init()
