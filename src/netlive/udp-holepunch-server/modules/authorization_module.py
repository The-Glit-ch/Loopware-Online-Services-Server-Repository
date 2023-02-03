# Imports
import hashlib
from jwt import decode
# Docstring
# /**
# * Loopware Online Subsystem @ Authorization Module: Python || Authorization Module for Python
# */

# Enums

# Constants

# Public Variables
def validateClientToken(clientToken: str, serverAccessToken: str) -> bool:
	hashedString = hashlib.new('sha256')
	hashedString.update(clientToken.encode())
	hashedString.digest()
	convertedToken= hashlib.new('sha256').update(clientToken.encode())

# Private Variables

# _init()

# Public Methods


# Private Methods

# Run