# Code signing policy

## Current status

SignPath Foundation approval has not been obtained. Unsigned previews must be labeled
as unsigned. No SignPath sponsorship or certificate is claimed before acceptance.

## Maintainer roles

- Author/committer: [HIGH0u](https://github.com/HIGH0u).
- Reviewer: HIGH0u; outside contributions require review before merging.
- Signing approver: HIGH0u, subject to SignPath acceptance and MFA verification.

MFA must be enabled for repository and SignPath access before signing is activated.
Every production signing request requires manual approval in SignPath. Secrets
are stored in GitHub Actions secrets, never in source control.

## Build origin

Windows artifacts are built from the public repository by the pinned Actions
workflow using the npm lockfile. Signing is a separately opted-in manual workflow
step, disabled until SignPath credentials and policy settings are configured.
Only approved Astra artifacts may be signed. We will confirm Electron executable
and third-party library treatment with SignPath before enabling production signing.

See the [privacy policy](PRIVACY.md) for network activity and local data storage.

If accepted, this page and release notes will add the Foundation-required credit:
“Free code signing provided by SignPath.io, certificate by SignPath Foundation.”
That sentence describes the intended future credit, not current approval.

If Astra becomes closed source or otherwise stops meeting the free program's
requirements, stop using Foundation signing and notify SignPath. Already published
GPL source and recipients' rights are not withdrawn by changing repository visibility.

