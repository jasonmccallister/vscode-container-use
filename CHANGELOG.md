# Change Log

All notable changes to the "container-use" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

- Initial release 
- Extension registers the container use MCP server
- Added a `Container Use: Setup Development Environment` command to ease onboarding
- Added `Container Use: Add MCP Server Configuration` command to create local `.vscode/mcp.json` configuration
- Added `containerUse.autoRegisterMcpServer` setting to disable automatic MCP server registration for all workspaces
- Added support for manual MCP server configuration management
- Added `Container Use: View Environments` command to open and focus the environments tree view
- Added context menu "Open Terminal" command for environment tree items to quickly access terminals
- Added context menu "Checkout Environment" command for environment tree items to switch environments
- Added quick pick fallback for "Open Terminal" command when no environment is selected
- Added quick pick fallback for "Checkout Environment" command when no environment is selected
- Terminal commands reuse a single "Container Use" terminal with improved busy-state detection and robust process interruption
- Checkout commands run behind the scenes with progress indicators and detailed success/error reporting
- Refactored command structure: separated terminal and checkout commands into dedicated modules
- Fixed MCP configuration format to use correct structure with `servers` at root level
- Updated environment tree items to display ID as label and title as description, matching CLI output format
- Fixed environment parsing to properly filter out header lines from CLI output