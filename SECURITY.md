Security issues in **sqtrackr** are taken seriously. If you discover a vulnerability, please report it responsibly so it can be investigated and fixed before it is publicly disclosed.

## Supported Versions

Security fixes are generally made against the latest version of sqtrackr.

| Version        |      Supported     |
| -------------- | ------------------ |
| Latest release | :white_check_mark: |
| `master`       | :white_check_mark: |
| Older releases | :x:                |

Users are encouraged to keep their sqtrackr installation up to date.

## Reporting a Vulnerability

> [!CAUTION]
> **Please do not open a public GitHub issue for security vulnerabilities.**

Instead, use GitHub's private vulnerability reporting feature:

1. Go to the repository's **Security** tab.
2. Select **Report a vulnerability**.
3. Include as much information as possible about the issue.

A useful report should include:

* A description of the vulnerability
* The affected component or endpoint
* Steps required to reproduce it
* The expected behavior
* The actual behavior
* The potential security impact
* The sqtrackr version or commit tested
* Relevant configuration details
* A proof of concept, if appropriate
* Any suggested fix or mitigation, if known

Please remove passwords, tokens, passkeys, private user data, database contents, and other secrets from screenshots, logs, or proof-of-concept material unless they are specifically required to demonstrate the issue.

## What Should Be Reported

Examples of issues that should be reported privately include:

* Authentication or authorization bypasses
* Account takeover vulnerabilities
* 2FA bypasses
* Privilege escalation
* Access to admin or staff functionality without permission
* Exposure of passwords, authentication tokens, tracker credentials, secrets, or other sensitive information
* Access to private torrents or tracker resources without the required authorization
* Unauthorized access to private messages or user information
* Server-side request forgery (SSRF)
* SQL/NoSQL injection or other injection vulnerabilities
* Remote code execution
* Path traversal or arbitrary file access
* Cross-site scripting (XSS) with meaningful security impact
* Cross-site request forgery (CSRF) affecting sensitive actions
* Unsafe file or `.torrent` processing
* Security issues involving uploaded avatars or other user-controlled files
* Vulnerabilities that allow users to bypass ratio, download, ban, or other access restrictions in a security-sensitive way
* Vulnerabilities in plugin permissions, plugin APIs, or plugin isolation boundaries
* Leakage of secrets from `config.js`, environment configuration, logs, APIs, or the client
* Vulnerabilities that allow one sqtrackr user to access or modify another user's data

## What Is Usually Not a Security Vulnerability

The following should generally be reported through normal GitHub issues instead:

* UI or styling bugs
* Missing validation that has no security impact
* Feature requests
* Performance problems that cannot realistically be used for denial of service
* Problems caused entirely by an administrator intentionally using an insecure configuration
* Vulnerabilities that require an attacker to already have full server or database administrator access
* Issues found only in unsupported, heavily modified forks
* Bugs in third-party software with no sqtrackr-specific impact

If you are unsure whether something is a security issue, reporting it privately is preferred.

## Self-Hosted Instances

sqtrackr is self-hosted. Vulnerabilities discovered on a third-party sqtrackr instance should not be tested beyond what is necessary to identify the issue.

Do not:

* Access other users' private information
* Download or modify data that does not belong to you
* Attempt to gain persistence
* Disrupt a running tracker
* Perform denial-of-service testing
* Use automated scanning that could significantly affect an instance
* Publish credentials, tokens, tracker passkeys, or other secrets

A vulnerability in a particular deployment may be caused by its configuration or infrastructure rather than sqtrackr itself. Reports should make this distinction where possible.

## Responsible Disclosure

Please allow reasonable time for a vulnerability to be investigated and fixed before publicly disclosing technical details.

After a report is received, the maintainers may:

1. Confirm receipt of the report.
2. Attempt to reproduce and assess the vulnerability.
3. Develop and test a fix.
4. Release the security fix.
5. Coordinate disclosure of the vulnerability when appropriate.

Please avoid publicly discussing an unresolved vulnerability until a fix or mitigation is available.

## Security Best Practices for Administrators

Administrators deploying sqtrackr should:

* Change the default `admin` password immediately after installation.
* Use HTTPS in production.
* Keep sqtrackr and its dependencies updated.
* Protect `config.js` and any files containing secrets.
* Use strong, unique JWT, server, database, SMTP, and other credentials.
* Restrict direct access to MongoDB and internal services.
* Regularly back up important data.
* Review installed plugins before deploying them.
* Only install plugins from sources you trust.
* Avoid exposing unnecessary services or management interfaces to the internet.
* Review logs for unexpected authentication or administrative activity.

The default administrator credentials are intended only for initial setup and must not be left unchanged on a production deployment.

## Plugins

sqtrackr plugins are trusted, build-time code and may have access to server and client functionality.

Installing a plugin should therefore be treated similarly to installing additional application code on the server.

A malicious or vulnerable third-party plugin is not necessarily a vulnerability in sqtrackr itself. However, vulnerabilities in sqtrackr's plugin APIs, permission handling, or boundaries that allow a plugin to gain capabilities it should not have are in scope and should be reported.

## Disclosure Credit

Researchers who responsibly report valid vulnerabilities may be credited in the relevant security advisory or release notes if they wish to be identified.

Thank you for helping keep sqtrackr and its users secure.
