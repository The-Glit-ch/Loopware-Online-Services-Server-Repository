# Imports
from random import randbytes

# Docstring
# /**
# * Loopware Online Subsystem @ Utils Module || Utilities module for UDP Holepunch Server
# */

# Enums

# Constants

# Public Variables

# Private Variables

# _init()

# Public Methods
def generateNewBindCode() -> str:
	"""
	a-zA-Z0-9

	(forbidden magic)
	"""
	return bytes(randbytes(8)).hex()

# Private Methods

# Run