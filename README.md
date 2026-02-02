# PasswordPal

PasswordPal is a secure, local-first password manager built with privacy and security as top priorities. It leverages a hybrid architecture combining a high-performance Rust backend with a modern React frontend to provide a seamless and secure user experience.

## Features

- **Local-First Security**: Your data is encrypted and stored locally on your device.
- **Strong Encryption**: Utilizes **AES-256-GCM** for vault encryption and **Argon2** for secure key derivation.
- **Zero-Knowledge Architecture**: Raw encryption keys are handled in memory only when necessary and strictly zeroed out using `zeroize` after use.
- **Secure Vault Management**:
  - Organize credentials with folders and tags.
  - Fast search and retrieval.
- **Session Security**:
  - Automatic memory wiping on lock.
  - Detection of remote session revocation (for hybrid sync scenarios).
- **Modern UI**: Built with React, TypeScript, and Tailwind CSS for a responsive, dark-mode favored aesthetic.

## Tech Stack

### Frontend

- **Framework**: React (v18)
- **Language**: TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Routing**: Client-side routing for seamless navigation.

### Backend (Tauri Core)

- **Language**: Rust
- **Framework**: Tauri v2
- **Cryptography**:
  - `aes-gcm` (Encryption)
  - `argon2` (Key Derivation)
  - `zeroize` (Memory Security)
  - `rand` & `rand_core` (CSPRNG)

## Installation & Setup

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or newer)
- [Rust](https://www.rust-lang.org/tools/install) (latest stable)

### Getting Started

1. **Clone the repository:**

   ```bash
   git clone <repository-url>
   cd PasswordPal
   ```

2. **Install frontend dependencies:**

   ```bash
   npm install
   ```

3. **Run the development server:**
   This command starts both the React dev server and the Tauri desktop window.

   ```bash
   npm run tauri dev
   ```

4. **Build for Production:**
   To create an optimized release build for your OS:
   ```bash
   npm run tauri build
   ```

## Security Architecture

PasswordPal uses a **Master Encryption Key (MEK)** model:

1. **MEK Generation**: A random MEK is generated to encrypt your vault data.
2. **Key Wrapping**: The MEK is encrypted (wrapped) using a **Key Encryption Key (KEK)** derived from your master password via **Argon2**.
3. **Zeroization**: Sensitive keys (both MEK and KEK) are wrapped in `Zeroizing` types to ensure they are wiped from memory immediately after use, preventing cold-boot attacks and memory dumps.
4. **Password Changes**: optimizing for O(1) complexity, password changes only require re-wrapping the MEK with a new KEK, leaving the bulk of the vault data untouched (and securely encrypted).

## Contributing

Contributions are welcome! Please follow standard secure coding practices when submitting pull requests, especially for cryptographic modules.

## License

[MIT License](LICENSE)
