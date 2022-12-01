# Authentication System || v1.0

# Steps
1. Generate 32 random bytes, save to file
2. Hash the 32 random bytes with "sha256", save to file
3. Private key is the hashed bytes
4. AUTH with the server by sending in a token request with hashed bytes in Authroization header
5. Server will compare the hash with the internal key (32 random bytes)
6. Generate 32 char long byte and hash it with sha256, return to sender, save only for 10 min
7. Repeat

# Authentication System || v1.1

# Steps

