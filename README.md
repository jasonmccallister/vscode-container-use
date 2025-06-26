# Container Use for VS Code

The VS Code Container Use extensions provides tight integration when developing Conding Agents using Container Use for VS Code.

## Requirements

- Docker

## Quickstart

1. Install the VS Code Container Use extension
2. Open a new project with VS Code
3. Run `Container Use: Install` and follow the prompts (running any Container Use command will verify and prompt for installation)
4. (Optional) Add the instructions for GitHub Copilot using `Container Use: Add Copilot instructions`

## Features

### Easily manage installation, updates to Container Use

Running Container Use commands will ensure that Container Use is installed. If VS Code cannot detect an installation it will prompt the user to install.

This extension will automatically detect if you machine has Homebrew support and offer multiple installation options.

### Automatic MCP Server Registration

Installing this extension will automatically register the MCP server, giving you the tools you need with no configuration required.

### Environment Management

The extension offers a comprehensive tree view for managing Container Use environments:

- **Environment Tree View**: Browse all available environments with their IDs, titles, and timestamps
- **Quick Terminal Access**: Right-click any environment in the tree to open a terminal with `cu terminal <env>`
- **Command Palette Support**: Use `Container Use: Open Terminal` to select an environment from a quick pick list
- **Automatic Refresh**: Environment list updates automatically and can be manually refreshed

The extensions offers quick ways to interact with agents working in git worktrees, allowing the user to merge environments, delete environments, open a terminal into the environment, all without leaving the editor.

## Testing

This project uses a dual testing strategy:

### Local Testing (VS Code Integration Tests)
```bash
yarn test
```
Runs full VS Code extension tests locally, requiring VS Code runtime and UI components.

### Container Testing (CI/Type Checking)
```bash
yarn test:ci
# or using Dagger
dagger call test
dagger call unit-test
```
Runs type checking, linting, and compilation in containers. These tests validate code quality without requiring VS Code runtime, making them suitable for CI environments.

**Note**: VS Code extension integration tests cannot run in headless containers due to their dependency on the VS Code UI framework. Container tests focus on static analysis and build validation.