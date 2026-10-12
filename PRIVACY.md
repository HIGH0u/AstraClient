# Privacy policy

This describes Astra 0.7's preview behavior.

## Account verification

When you sign in, Microsoft's page handles your credentials in a separate sandboxed
browser view. Astra exchanges authorization and session tokens with Microsoft,
Xbox, and Minecraft services to verify your Minecraft Java profile. Astra does not
receive or store your Microsoft password. Restoring a saved session contacts these
services when the app starts. Microsoft's services are subject to
[Microsoft's privacy statement](https://privacy.microsoft.com/privacystatement).

The main process keeps access tokens in memory. It saves a refresh token encrypted
with Electron safeStorage using Windows protection in `%APPDATA%/astra-client`.
There is no plaintext-token fallback. The interface receives profile information,
not authentication tokens. Your profile's skin is fetched from
`textures.minecraft.net` for the avatar preview; no third-party avatar service is used.

## Local profiles

Your bio, favorite server, saved contact names, chosen presence, loader preferences,
and motion settings are stored locally. They are not uploaded to an Astra server.
There is currently no live presence, friend-request service, telemetry, advertising,
analytics, or payment processing implemented by Astra.

## Deletion

Sign out to remove the saved refresh token. To remove all local preferences and
account data, close Astra and delete `%APPDATA%/astra-client`. This does not revoke
Microsoft-wide consent; manage that in your Microsoft account.

For questions, open a repository issue without including passwords, tokens, skin
URLs from private logs, or other sensitive account data.

