# Loopware Online Subsystem - Docker
While these subsystems can be ran in a local environment, it is a good idea to instead dockerize these systems into docker containers

This folder containers docker files and docker compose files that can be used for quickly spinning up instances of the Loopware Online Subsystems

## Example
Example of how the directory should look like when building a docker image

```
auth-server
	|-dockerfile
	|-build
		|-src
			|-index
		|...
			|..
		|...
			|..
	|package.json
```

Better documentation will come soon:tm: