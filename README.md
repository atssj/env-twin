# env-twin

Synchronize your .env.example and .env files effortlessly. env-twin ensures your environment variable templates and actual configurations stay in sync by copying missing keys, highlighting differences, and keeping your project's environment setup consistent and up to date.

[![Build and Test](https://github.com/atssj/env-twin/actions/workflows/test.yml/badge.svg?branch=main)](https://github.com/atssj/env-twin/actions/workflows/test.yml)

## Features

- 🚀 Automatically syncs environment variables between `.env` and `.env.example` files
- 🔒 Securely handles sensitive data by removing actual values in example files
- 📝 Preserves comments and formatting
- 🛠️ Customizable input/output file paths
- 💪 Written in TypeScript for better type safety and maintainability

## Installation

<details>
<summary>npm</summary>

```bash
npm install env-twin
```

</details>

<details>
<summary>yarn</summary>

```bash
yarn add env-twin
```

</details>

<details>
<summary>pnpm</summary>

```bash
pnpm add env-twin
```

</details>

<details>
<summary>Bun</summary>

```bash
bun add env-twin
```

</details>

## Usage

### Basic Usage

<details>
<summary>npm</summary>

```bash
# Using default paths (.env -> .env.example)
npx env-twin

# Using custom paths
npx env-twin --source .env.development --dest .env.dev.example
```

</details>

<details>
<summary>yarn</summary>

```bash
# Using default paths (.env -> .env.example)
yarn env-twin

# Using custom paths
yarn env-twin --source .env.development --dest .env.dev.example
```

</details>

<details>
<summary>pnpm</summary>

```bash
# Using default paths (.env -> .env.example)
pnpm env-twin

# Using custom paths
pnpm env-twin --source .env.development --dest .env.dev.example
```

</details>

<details>
<summary>Bun</summary>

```bash
# Using default paths (.env -> .env.example)
bunx env-twin

# Using custom paths
bunx env-twin --source .env.development --dest .env.dev.example
```

</details>

### Command Line Options

| Option      | Alias                                       | Description                        | Default        |
| ----------- | ------------------------------------------- | ---------------------------------- | -------------- |
| `--source`  | `--src`                                     | Source .env file path              | `.env`         |
| `--dest`    | `--destination`, `--d`, `--out`, `--target` | Destination .env.example file path | `.env.example` |
| `--help`    | `-h`                                        | Display help message               | -              |
| `--version` | `-v`                                        | Display version information        | -              |

### Examples

<details>
<summary>npm</summary>

```bash
# Sync development environment
npx env-twin --source .env.development --dest .env.dev.example

# Sync production environment
npx env-twin --source .env.production --dest .env.prod.example

# Sync with custom paths
npx env-twin --source config/.env.local --dest config/.env.example
```

</details>

<details>
<summary>yarn</summary>

```bash
# Sync development environment
yarn env-twin --source .env.development --dest .env.dev.example

# Sync production environment
yarn env-twin --source .env.production --dest .env.prod.example

# Sync with custom paths
yarn env-twin --source config/.env.local --dest config/.env.example
```

</details>

<details>
<summary>pnpm</summary>

```bash
# Sync development environment
pnpm env-twin --source .env.development --dest .env.dev.example

# Sync production environment
pnpm env-twin --source .env.production --dest .env.prod.example

# Sync with custom paths
pnpm env-twin --source config/.env.local --dest config/.env.example
```

</details>

<details>
<summary>Bun</summary>

```bash
# Sync development environment
bunx env-twin --source .env.development --dest .env.dev.example

# Sync production environment
bunx env-twin --source .env.production --dest .env.prod.example

# Sync with custom paths
bunx env-twin --source config/.env.local --dest config/.env.example
```

</details>

## How It Works

env-twin processes your environment files in the following way:

1. Reads the source `.env` file
2. Preserves all comments and empty lines
3. For each environment variable:
   - Keeps the original variable name
   - Replaces the value with a placeholder in the format: `"input_variable_name"`
4. Writes the processed content to the destination `.env.example` file

### Example Transformation

Input (`.env`):

```env
# Database configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mydb
DB_USER=admin
DB_PASSWORD=secret123
```

Output (`.env.example`):

```env
# Database configuration
DB_HOST="input_db_host"
DB_PORT="input_db_port"
DB_NAME="input_db_name"
DB_USER="input_db_user"
DB_PASSWORD="input_db_password"
```

## Development

### Prerequisites

- Node.js (v14 or higher)
- npm, yarn, pnpm, or bun

### Setup

1. Clone the repository:

```bash
git clone https://github.com/atssj/env-twin.git
cd env-twin
```

2. Install dependencies:

```bash
npm install
```

3. Build the project:

```bash
npm run build
```

### Available Scripts

| Script                  | Description                            |
| ----------------------- | -------------------------------------- |
| `npm run build`         | Build the TypeScript project           |
| `npm run test`          | Run tests                              |
| `npm run lint:format`   | Format code using Prettier             |
| `npm start`             | Run the built project                  |
| `bun changeset`         | Generate a new changeset file          |
| `bun changeset:version` | Update package versions and changelogs |
| `bun changeset:publish` | Publish packages to npm                |

### Running Tests

```bash
npm test
```

## Release Process

This project uses [Changesets](https://github.com/changesets/changesets) to manage releases.

### Generating a Changeset

When you make a change that you want to include in a release, you need to generate a changeset file. This file documents the changes and specifies the type of version bump (major, minor, or patch) for each package.

To generate a new changeset, run the following command:

```bash
bun changeset
```

This will prompt you to select the packages to include in the changeset and the type of version bump for each package. It will also ask for a summary of the changes.

### How it Works

Changeset files are stored in the `.changeset` directory. They are plain text files that describe the changes made in a human-readable format.

When a pull request containing changesets is merged into the `main` branch, the release workflow is triggered. This workflow automatically:

1. Consumes the changeset files.
2. Updates the versions of the packages in `package.json`.
3. Updates the `CHANGELOG.md` file.
4. Commits these changes.
5. Publishes the new versions to npm.

This process ensures that releases are consistent and that changelogs are always up-to-date.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

If you encounter any issues or have questions, please [open an issue](https://github.com/atssj/env-twin/issues) on GitHub.

## Acknowledgments

- Thanks to all contributors who have helped shape this project
- Inspired by the need for better environment variable management in Node.js projects
