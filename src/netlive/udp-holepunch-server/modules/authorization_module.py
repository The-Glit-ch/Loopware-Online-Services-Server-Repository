# Imports
import hashlib, base64
from jwt import decode
# Docstring
# /**
# * Loopware Online Subsystem @ Authorization Module: Python || Authorization Module for Python
# */

# Enums

# Constants

# Public Variables

# Private Variables

# _init()

# Public Methods
# /**
#  * Checks the client token with the server access token. Returns true if valid
#  * @param { string } clientToken The incoming client token to check
#  * @param { string } serverAccessToken The server access token to compare too
#  * @returns { boolean } Returns true or false
#  */
def validateClientToken(clientToken: str, serverAccessToken: str) -> bool:
	"""
	* Checks the client token with the server access token. Returns true if valid
	* @param { string } clientToken - The incoming client token to check
	* @param { string } serverAccessToken - The server access token to compare too
	* @returns { boolean } - Returns true or false
	"""
	hashedToken = hashlib.new('sha256')
	hashedToken.update(clientToken.encode('utf-8'))
	return base64.b64encode(hashedToken.digest()).decode('utf-8') == serverAccessToken

# /**
#  * Verifies and decodes a JWT using the server token used to encode it with
#  * @param { string } clientJWT The client JWT to decode
#  * @param { string } serverToken The server token to decode with
#  * @returns { Promise<any> } Returns a decoded JWT payload
#  */
def verifyAndDecodeJWT(clientJWT: str, serverToken: str):
	"""
	* Verifies and decodes a JWT using the server token used to encode it with
	* @param { string } clientJWT The client JWT to decode
	* @param { string } serverToken The server token to decode with
	* @returns { Promise<any> } Returns a decoded JWT payload
 	"""
	return decode(clientJWT, serverToken, algorithms=["HS256"])

# Private Methods

# Run