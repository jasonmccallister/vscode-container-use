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

### Easy and Automatic Installation

Running Container Use commands will ensure that Container Use is installed. If VS Code cannot detect an installation it will prompt the user to install.

This extension will automatically detect if you machine has Homebrew support and offer multiple installation options.

### Automatic MCP Server Registration

Installing this extension will automatically register the MCP server, giving you the tools you need with no configuration required.

### Environment Management

The extensions offers quick ways to interact with agents working in git worktrees, allowing the user to merge environments, delete environments, open a terminal into the environment, all using VS Code commands.