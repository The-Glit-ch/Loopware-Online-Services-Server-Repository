# Loopware Online Subsystem - Docker
While these subsystems can be ran in a local environment, it is a good idea to instead dockerize these systems into docker containers

This folder containers docker files and docker compose files that can be used for quickly spinning up instances of the Loopware Online Subsystems

## Note
When running ``docker build`` make sure you have a fresh build of the subsystem you want to use in the same directory as the dockerfile. Example below

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
```

Better documentation will come soon:tm: