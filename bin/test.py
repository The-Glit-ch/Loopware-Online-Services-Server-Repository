#!/bin/python
# Simple script that just runs tests
import os

# Authorization Subsystem
os.chdir("./authorization_server")
os.system("npm ci")
os.system("npm run test")