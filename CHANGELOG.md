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
- Added `Container Use: Watch` command to run `cu watch` in the Container Use terminal
- Added `Container Use: Version` command to display the current Container Use version
- Added `Container Use: Check for Updates` command to check for and install updates based on installation method
- Added context menu "Open Terminal" command for environment tree items to quickly access terminals
- Added context menu "View Logs" command for environment tree items to view environment logs
- Added context menu "Checkout Environment" command for environment tree items to switch environments
- Added context menu "Merge Environment" command for environment tree items to merge environments
- Added context menu "Delete Environment" command for environment tree items to delete environments
- Added quick pick fallback for "Open Terminal" command when no environment is selected
- Added quick pick fallback for "View Logs" command when no environment is selected
- Added quick pick fallback for "Checkout Environment" command when no environment is selected
- Added quick pick fallback for "Merge Environment" command when no environment is selected
- Added quick pick fallback for "Delete Environment" command when no environment is selected
- Added optional delete prompt after successful environment merge operations
- Terminal and log commands reuse a single "Container Use" terminal with improved busy-state detection and robust process interruption
- Checkout commands run behind the scenes with progress indicators and detailed success/error reporting
- Merge and delete commands run behind the scenes with progress indicators and detailed success/error reporting
- Refactored command structure: separated terminal, log, checkout, merge, and delete commands into dedicated modules
- Abstracted terminal reuse logic into shared utility module for better code organization and maintainability
- Abstracted environment quick pick logic into shared utility module to eliminate code duplication across commands
- Fixed MCP configuration format to use correct structure with `servers` at root level
- Updated environment tree items to display ID as label and title as description, matching CLI output format
- Fixed environment parsing to properly filter out header lines from CLI output