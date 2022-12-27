#!/bin/python
# Simple script that just runs tests
from subprocess import call

# Authorization Subsystem
status = call("npm ci",cwd="../authorization_server",shell=True)
status = call("npm run build && cd ./build && node ./authorization_server/src/index.js",cwd="../authorization_server",shell=True)
status = call("npm run test",cwd="../authorization_server",shell=True)