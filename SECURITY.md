# Security Policy

Thanks for helping keep env-twin secure! 🛡️

## Quick Links

- [Report a Vulnerability](https://github.com/atssj/env-twin/security/advisories/new)
- [View Advisories](https://github.com/atssj/env-twin/security/advisories)

---

## Supported Versions

We actively maintain the following versions:

| Version | Security Fixes | New Features |
| ------- | -------------- | ------------ |
| 1.1.x   | ✅ Yes         | ✅ Yes       |
| 1.0.x   | ✅ Yes         | ❌ No        |
| < 1.0   | ❌ No          | ❌ No        |

**Recommendation**: Always use the latest version for the best security.

---

## Reporting a Vulnerability

### How to Report

**Use GitHub Security Advisories** (preferred):

👉 [Report privately here](https://github.com/atssj/env-twin/security/advisories/new)

This keeps your report private until we've fixed the issue.

### What to Include

A good report helps us fix things faster. Please include:

| What                   | Example                                                                    |
| ---------------------- | -------------------------------------------------------------------------- |
| **Description**        | "Path traversal allows reading files outside project directory"            |
| **Steps to reproduce** | 1. Run `env-twin restore ../malicious-backup` 2. Observe...                |
| **Affected versions**  | "Tested on v1.0.3 and v1.1.0"                                              |
| **Impact**             | "Attackers can read arbitrary files on the system"                         |
| **Proof of concept**   | Code snippet or command that demonstrates the issue (optional but helpful) |

### What Happens Next

| Step                          | Timeline                                      |
| ----------------------------- | --------------------------------------------- |
| 1. We acknowledge your report | Within 3 business days                        |
| 2. We investigate and confirm | Within 7 business days                        |
| 3. We develop a fix           | Within 14 days (critical), 30 days (moderate) |
| 4. We release and disclose    | After fix is tested and published             |

### After the Fix

- We'll publish a [Security Advisory](https://github.com/atssj/env-twin/security/advisories) with details
- We'll credit you in the advisory (if you want — just let us know!)
- We'll request a CVE if appropriate

---

## Built-in Security Features

env-twin includes several security protections:

### 🔒 Path Traversal Prevention

All file paths are validated to prevent accessing files outside your project.

```bash
# This is blocked:
env-twin restore ../../etc/passwd  # ❌ Error: Path traversal detected
```

### 🔗 Symlink Attack Prevention

Symlinks are detected and rejected during restore operations.

### ⚡ Atomic File Writes

Files are written atomically to prevent corruption during crashes.

### 📁 Permission Preservation

File permissions are preserved during backup and restore.

---

## Scope

### ✅ In Scope

- `env-twin` CLI commands (`sync`, `restore`, `clean-backups`)
- Backup file handling
- File system operations
- Environment variable parsing

### ❌ Out of Scope

- Vulnerabilities in third-party dependencies → Report to the dependency maintainer
- Social engineering attacks
- Physical access attacks
- DoS attacks requiring unrealistic resources

---

## Security Best Practices for Users

When using env-twin in production:

| Practice                            | Why                                  |
| ----------------------------------- | ------------------------------------ |
| ✅ Keep backups in `.gitignore`     | Prevents secrets in version control  |
| ✅ Use `--no-backup` carefully      | Only in trusted environments         |
| ✅ Review restore sources           | Only restore from trusted backups    |
| ✅ Set restrictive file permissions | `chmod 600 .env` for sensitive files |

---

## Need Help?

- 📖 [Documentation](https://github.com/atssj/env-twin#readme)
- 🐛 [Report a Bug](https://github.com/atssj/env-twin/issues/new)
- 💬 [Questions?](https://github.com/atssj/env-twin/discussions)

---

_Last updated: February 2026_
