# Imports
import socket
import schedule
from os import environ
from json import loads, dumps
from typing import Final
from dotenv import load_dotenv
from pytypes.net_types import ConnectionInfo
from modules.utils_module import generateNewBindCode
from modules.authorization_module import validateClientToken, verifyAndDecodeJWT
from modules.logging_module import log, wrn
load_dotenv(".env/.live-udp-config.env")

# Docstring
# /**
# * Loopware Online Subsystem @ UDP Hole Punch Server || https://en.wikipedia.org/wiki/UDP_hole_punching
# */
# TODO: Find a better way of doing this shit

# Types

# Enums

# Constants
LOCAL_IP: Final[str] = "0.0.0.0"				# Don't touch
LOCAL_PORT: Final[int] = int(environ["PORT"])	# Can be edited via ENV_VARS
BUFFER_SIZE: Final[int] = 1024					# Don't touch

# Public Variables

# Private Variables
# --> Refer to TODO
_connectedClients: list = []
_hostingClients: dict = {}
_currentSessions: dict = {}
_UDPResponseCodes: dict = {
	"CONN_ACKNOWLEDGED": "CONN_ACKNOWLEDGED",
	"CONN_ESTABLISHED": "CONN_ESTABLISHED",
	"CONN_ALR_ESTABLISHED": "CONN_ALR_ESTABLISHED",
	"CONN_NOT_REGISTERED": "CONN_NOT_REGISTERED",
	"CONN_ALR_HOSTING": "CONN_ALR_HOSTING",
	"CONN_ALR_IN_SESSION": "CONN_ALR_IN_SESSION",
	"CONN_SESSION_NOT_FOUND": "CONN_SESSION_NOT_FOUND",
	"AUTH_ACCESS_TOKEN_INVALID": "AUTH_ACCESS_TOKEN_INVALID",
	"AUTH_CLIENT_TOKEN_INVALID": "AUTH_CLIENT_TOKEN_INVALID",
	"SERVER_HEARTBEAT": "SERVER_HEARTBEAT"
}

# _init()
def _init() -> None:
	# Create a new UDP Socket
	UDPServerSocket = socket.socket(family=socket.AF_INET, type=socket.SOCK_DGRAM)
	log("Creating UDP socket")
	
	# Heartbeat scheduler
	schedule.every(2).seconds.do(_sendServerHeartbeatStatus, udpSocket=UDPServerSocket)

	# Bind the socket / Create server
	UDPServerSocket.bind((LOCAL_IP, LOCAL_PORT))
	log(f"UDP \"TURN\" Server started on port {LOCAL_PORT}")

	# Config
	UDPServerSocket.setblocking(False) # This is gay

	# Poll data and run pending schedules
	while True:
		schedule.run_pending()
		try:
			incomingData = UDPServerSocket.recvfrom(BUFFER_SIZE)
		
			if incomingData:
				# Message is byte values, Address is (IP, PORT)
				incomingMessage: dict = _returnDecodedMessage(incomingData[0])
				incomingAddr: ConnectionInfo = ConnectionInfo(incomingData[1])
				log("Received new data")

				# Authorization "middleware"
				try:
					accessToken: str = incomingMessage["authorization"]
					decodedToken: dict = verifyAndDecodeJWT(accessToken, environ["SERVER_ACCESS_TOKEN"])["token"]
					if not validateClientToken(str(decodedToken), environ["SERVER_ACCESS_TOKEN"]):
						returnData: dict = {"type": "SERVER_COMM", "code": _UDPResponseCodes["AUTH_CLIENT_TOKEN_INVALID"], "message": "Invalid client token..How did you even get here??"}
						UDPServerSocket.sendto(_returnEncodedMessage(returnData), incomingAddr.returnInfo())
						continue

				except Exception as error:
					returnData: dict = {"type": "SERVER_COMM", "code": _UDPResponseCodes["AUTH_ACCESS_TOKEN_INVALID"], "message": "Invalid access token"}
					wrn(f"Error decoding JWT. Possibly user error || {error}")
					UDPServerSocket.sendto(_returnEncodedMessage(returnData), incomingAddr.returnInfo())
					continue
				
				else:
					# Client returned heartbeat
					if incomingMessage["connectionType"] == "ClientHeartbeat":
						_connectedClients.append(incomingAddr.returnInfo())
						continue

					# Client attempting to register
					if incomingMessage["connectionType"] == "Registration":
						# Duplicate connection found, should not happen as often but eh
						if incomingAddr in _connectedClients:
							returnData: dict = {"type": "SERVER_COMM", "code": "CONN_ALR_ESTABLISHED", "message": "Already connect to TURN Server"}
							UDPServerSocket.sendto(_returnEncodedMessage(returnData), incomingAddr.returnInfo())
							continue
							
						# Add connection to currently connected clients
						_connectedClients.append(incomingAddr.returnInfo())
						returnData: dict = {"type": "SERVER_COMM", "code": "CONN_ESTABLISHED", "message": "Connection established"}
						UDPServerSocket.sendto(_returnEncodedMessage(returnData), incomingAddr.returnInfo())
						log("New client added")
						continue
					
					# Client attempting to create a new session
					if incomingMessage["connectionType"] == "CreateSession":
						# Check if remote is registered
						if incomingAddr.returnInfo() not in _connectedClients:
							returnData: dict = {"type": "SERVER_COMM", "code": _UDPResponseCodes["CONN_NOT_REGISTERED"], "message": "Please register before using the Punchthrough Service"}
							UDPServerSocket.sendto(_returnEncodedMessage(returnData), incomingAddr.returnInfo())
							continue
						
						# Check if remote is already hosting
						if _hostingClients.get(incomingAddr.returnInfo()) != None:
							returnData: dict = {"type": "SERVER_COMM", "code": _UDPResponseCodes["CONN_ALR_HOSTING"], "message": "Already hosting a session. Please destroy your current session in order to create new ones"}
							UDPServerSocket.sendto(_returnEncodedMessage(returnData), incomingAddr.returnInfo())
							continue
						
						# Generate new bind code and "create" new session
						generatedBindCode: str = generateNewBindCode()
						while True:
							if generatedBindCode not in _hostingClients.values():
								break

							generatedBindCode = generateNewBindCode()
							
						# Add client to hosting list
						_hostingClients[incomingAddr.returnInfo()] = generatedBindCode
						_currentSessions[generatedBindCode] = {"clients": [], "host": incomingAddr}

						# Response
						returnData: dict = {"type": "SERVER_COMM", "code": _UDPResponseCodes["CONN_ACKNOWLEDGED"], "message": "Successfully created a new session", "data": generatedBindCode}
						UDPServerSocket.sendto(_returnEncodedMessage(returnData), incomingAddr.returnInfo())
						continue

					# Client attempting to join a session
					if incomingMessage["connectionType"] == "JoinSession":
						# Check if remote is registered
						if incomingAddr.returnInfo() not in _connectedClients:
							returnData: dict = {"type": "SERVER_COMM", "code": _UDPResponseCodes["CONN_NOT_REGISTERED"], "message": "Please register before using the Punchthrough Service"}
							UDPServerSocket.sendto(_returnEncodedMessage(returnData), incomingAddr.returnInfo())
						
						# Check if remote is hosting
						if _hostingClients.get(incomingAddr.returnInfo()) != None:
							returnData: dict = {"type": "SERVER_COMM", "code": _UDPResponseCodes["CONN_ALR_HOSTING"], "message": "Already hosting a session. Please destroy your current session in order to join new ones"}
							UDPServerSocket.sendto(_returnEncodedMessage(returnData), incomingAddr.returnInfo())
						
						# Check if remote is already in a session
						# This can lead to performance issues
						for sessions in _currentSessions.values():
							if incomingAddr.returnInfo() in sessions["clients"]:
								returnData: dict = {"type": "SERVER_COMM", "code": _UDPResponseCodes["CONN_ALR_IN_SESSION"], "message": "Already in a session. Please destroy your current session in order to join new ones"}
								UDPServerSocket.sendto(_returnEncodedMessage(returnData), incomingAddr.returnInfo())
								break
						else:
							try:
								# Get join code
								sessionJoinCode: str = incomingMessage["joinCode"]

								# Check if join code is valid
								if sessionJoinCode not in _currentSessions.keys():
									returnData: dict = {"type": "SERVER_COMM", "code": _UDPResponseCodes["CONN_SESSION_NOT_FOUND"], "message": "Session not found"}
									UDPServerSocket.sendto(_returnEncodedMessage(returnData), incomingAddr.returnInfo())
									continue
								
								# Add client to session
								_currentSessions[sessionJoinCode]["clients"].append(incomingAddr.returnInfo())
								log("Added client to session")
								print(_currentSessions)

								returnData: dict = {"type": "SERVER_COMM", "code": _UDPResponseCodes["CONN_ACKNOWLEDGED"], "message": "Successfully join session"}
								UDPServerSocket.sendto(_returnEncodedMessage(returnData), incomingAddr.returnInfo())
								continue
							
							except Exception as error:
								log(error)
								continue

		
		except Exception as error:
			# Actual hell
			pass



# Public Methods


# Private Methods
def _returnDecodedMessage(data: bytes) -> dict:
	return loads(data.decode('utf-8'))

def _returnEncodedMessage(data: dict) -> bytes:
	return dumps(data).encode('utf-8')

def _sendServerHeartbeatStatus(udpSocket) -> None:
	returnData: dict = {"type": "SERVER_COMM_HEARTBEAT", "code": "SERVER_HEARTBEAT", "message": "Online"}
	for i in _connectedClients:
		udpSocket.sendto(_returnEncodedMessage(returnData), i)
	log(f"Server heartbeat sent to {len(_connectedClients)} clients")
	_connectedClients.clear()
	return

# Run
if __name__ == "__main__":		
	_init()
