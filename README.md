# Loopware Online Subsystem || Server Repository
An all-in-one solution for handling anything "cloud" related in your Games/Applications. Although this was originally made for the Godot engine this *should* work with any other application as long as they support HTTP(S) and UDP

## Features
<details>
<summary> Authentication </summary>
- User/Client Authorization via JWT
</details>

<details>
<summary> Datastore Service </summary>
- Fully manageable Datastore service built with MongoDB
<br>
Allows for Cloud Saves, Leaderboards, Asset Streaming, and more
</details>

<details>
<summary> Net/Live Service </summary>
- VoIP
<br>
-( UDP Punchthrough)[https://en.wikipedia.org/wiki/UDP_hole_punching] via custom (TURN Server)[https://en.wikipedia.org/wiki/Traversal_Using_Relays_around_NAT]
<br>
- Game/App Analytics
</details>


## Current Features
* Authorization System
	- User/Client Authorization (DONE)✅

* Datastore Service
	- Datastore (DONE)✅

	- Leaderboard (DONE)✅

	- Asset Streaming (DONE) ✅

* Net/Live Service
	- VoIP (TODO)❌
	- UDP Hole Punch (DONE) ✅
	- Game/App Analytics (DONE but not implemented fully)⚠️

* Other
	- Godot Plugin/SDK (Working) 👨‍💻
	- Dashboard (WORKING) 👨‍💻

# THIS IS NOT DONE. DON'T USE IN PRODUCTION (yet.)