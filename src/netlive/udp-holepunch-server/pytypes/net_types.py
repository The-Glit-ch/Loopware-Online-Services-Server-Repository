# Imports

# Docstring

# Types
class ConnectionInfo:
	IP: str
	PORT: int
	
	def __init__(self, incomingAddr: tuple) -> None:
		self.IP = incomingAddr[0]
		self.PORT = incomingAddr[1]
	
	def returnIP(self) -> str:
		return self.IP
	
	def returnPORT(self) -> int:
		return self.PORT
	
	def returnInfo(self) -> tuple:
		return (self.IP, self.PORT)

# Enums

# Constants

# Public Variables

# Private Variables

# _init()

# Public Methods

# Private Methods

# Run


