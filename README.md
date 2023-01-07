# Loopware Online Subsystem || Server Repository
An all-in-one solution for handling anything "cloud" related in your Games/Applications. Although this was originally made for the Godot engine this *should* work with any other application as long as they support HTTP(S) and websocket

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
- NAT Punchthrough
<br>
- Game/App Analytics
</details>


## Current Features
```diff
Authorization System
+	Server Authorization			[DONE]
-	User Authorization				[TODO]

Datastore Service
+	Datastore						[DONE]
+		Authorization Support		[DONE]
-	Leader Board					[TODO]
-		Authorization Support		[TODO]

Net/Live Service || Not started
-	VOIP							[TODO]
-	Game Analytics					[TODO]

Other
- Dashboard							[TODO]
- Godot Plugin/SDK's				[TODO]

Modules
+	Logging Module					[DONE]
+	Authorization Module			[DONE]
```

# THIS IS NOT DONE. DON'T USE IN PRODUCTION (yet.)