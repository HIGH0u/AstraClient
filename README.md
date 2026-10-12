# Astra

A calm, space-themed Minecraft Java launcher project for Windows.

**Early preview:** account sign-in and the hub are implemented. Minecraft installation,
game launching, live friends, and subscriptions are not implemented. Loader and game
version selections are interface previews, not runtime compatibility claims.

## Features

- Microsoft, Xbox, and Minecraft profile verification; encrypted local session storage.
- Animated ringless planet, subtle mouse parallax, and a maximizable signed-in hub.
- Minecraft skin busts and editable local profiles.
- Local contacts and presence preferences. No friend requests are sent.

## Development

Windows x64, Node.js 24, npm, and Git are required.

```sh
npm ci
npm run build:ui
npm run check
npm test
npm start
```

The interactive UI checks use isolated test profiles:

```sh
node tests/smoke.cjs
node tests/hub.cjs
```

Run `npm run package` to create `release/<version>/Astra-win32-x64/Astra.exe`.
Automated Windows builds are in [Actions](https://github.com/HIGH0u/AstraClient/actions).
Previews are published under [Releases](https://github.com/HIGH0u/AstraClient/releases).
Unsigned previews may be blocked by Windows policy. Do not disable security controls
to run them. A successful build is not a code-signing approval.

## Privacy and removal

Read the [privacy policy](PRIVACY.md). Close Astra and delete its extracted application
folder to remove the portable application. To remove locally stored sessions and
preferences as well, delete `%APPDATA%/astra-client` after closing Astra. Signing out
removes the saved refresh token but does not delete local profile preferences.

## Code signing policy

See [Code signing policy](CODE_SIGNING.md). **SignPath approval is pending; current
releases are not claimed to be signed or sponsored by SignPath.**

## License

Astra's original source and included project artwork are offered under GPL-3.0-only,
to the extent the contributors hold rights in those materials. See [LICENSE](LICENSE).
Third-party components retain their own licenses; see [THIRD_PARTY_NOTICES.txt](THIRD_PARTY_NOTICES.txt).
The source repository does not contain Minecraft game files.

Astra is an independent project, not an official Minecraft product and not approved
by or associated with Mojang or Microsoft. Third-party names identify compatibility
targets; their inclusion does not imply endorsement.

