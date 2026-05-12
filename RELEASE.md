# Release Management Guide

## Overview

The CI/CD pipeline uses conventional commits to automatically determine when to create new app versions. This follows industry standards and provides automatic semantic versioning based on commit types.

## How It Works

### Commit Message Format

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

Use the following conventional commit prefixes to trigger version creation:

- `fix:` - Creates a patch version (e.g., 0.1.5 → 0.1.6)
- `feat:` - Creates a minor version (e.g., 0.1.5 → 0.2.0)
- `feat!:` - Creates a major version (e.g., 0.1.5 → 1.0.0)

### Version Rules

- **Patch (`fix:`)**: Backward-compatible bug fixes
- **Minor (`feat:`)**: Backward-compatible new features
- **Major (`feat!:`)**: Breaking changes or major feature additions

## Usage Examples

```bash
# Bug fix - patch version
git commit -m "fix: resolve login issue"

# New feature - minor version
git commit -m "feat: add password strength indicator"

# Breaking change - major version
git commit -m "feat!: redesign authentication system"

# With scopes (also work)
git commit -m "feat(auth): add biometric login"
git commit -m "fix(ui): fix button alignment"

# No version created
git commit -m "docs: update README"
git commit -m "chore: update dependencies"
git commit -m "style: fix code formatting"
git commit -m "refactor: improve password encryption"
git commit -m "test: add unit tests for auth"
git commit -m "perf: optimize database queries"
```

## CI/CD Behavior

### When Conventional Commits Are Detected:

1. Runs all tests (React + Rust)
2. Builds Tauri binaries for all platforms
3. Updates version numbers in:
   - `package.json`
   - `src-tauri/tauri.conf.json`
   - `src-tauri/Cargo.toml`
4. Creates GitHub Release with semantic version tags
5. Uploads platform-specific binaries

### When No Conventional Commits:

1. Runs all tests (React + Rust)
2. Skips expensive Tauri builds
3. Skips version number updates
4. Skips GitHub Release creation

## Migration Notes

- Previous workflow created releases for every push to main branch, regardless of the updates made, coupling both CI
- New workflow uses conventional commits (`fix:`, `feat:`, `feat!:`)
- Semantic versioning is automatic based on commit type
- Multi-file version sync is maintained (package.json, tauri.conf.json, Cargo.toml)
- Follows industry-standard conventional commits specification
