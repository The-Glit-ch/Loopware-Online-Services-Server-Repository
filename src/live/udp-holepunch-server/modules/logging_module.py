# Imports
import os
from datetime import datetime
from os import path

# Docstring
# /**
# * Loopware Online Subsystem @ Logging Module: Python || Simple logging module similar to the JS/TS version
# * just made for python
# */

# Enums

# Constants

# Public Variables

# Private Variables
_currentDate: datetime = datetime.today()
_loggingFileName: str = f"{_currentDate.strftime('%m-%d-%Y_%H.%M.%S')}.log"
_loggingFileDirectory: str = "./logs"

# _init()
def _init() -> None:
	_createLoggingDirectory()

# Public Methods
def log(*message) -> None:
	"""
	Logs a message to stdout and writes it to file
	@param { any | str } message - Message to log
	@returns { None }
	"""
	
	formattedLog: str = f"[LOG @ {_currentDate.strftime('%m/%d/%Y')}] "
	for msg in message: formattedLog = formattedLog + str(msg) + " "
	_writeToFile(formattedLog)
	print(formattedLog)

def wrn(*message) -> None:
	"""
	Logs a warning message to stdout and writes it to file
	@param { any | str } message - Message to log
	@returns { None }
	"""

	formattedLog: str = f"[WRN @ {_currentDate.strftime('%m/%d/%Y')}] "
	for msg in message: formattedLog = formattedLog + str(msg) + " "
	_writeToFile(formattedLog)
	print(formattedLog)

def err(*message) -> None:
	"""
	Logs an error message to stdout and writes it to file
	@param { any | str } message - Message to log
	@returns { None }
	"""

	formattedLog: str = f"[ERR @ {_currentDate.strftime('%m/%d/%Y')}] "
	for msg in message: formattedLog = formattedLog + str(msg) + " "
	_writeToFile(formattedLog)
	print(formattedLog)

# Private Methods
def _createLoggingDirectory() -> None:
	if not path.exists(path.join(os.getcwd(), _loggingFileDirectory)):
		os.mkdir(path.join(os.getcwd(), _loggingFileDirectory))
		return

def _writeToFile(message) -> None:
	logFileName: str =  path.join(os.getcwd(), _loggingFileDirectory, _loggingFileName)
	with open(logFileName, "a+") as file:
		file.write(message + "\n")
		file.close()

# Run
_init()
