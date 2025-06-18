import * as vscode from 'vscode';
import * as commands from './commands/commands';
import * as mcp from './mcpserver/mcpserver';

export function activate(context: vscode.ExtensionContext) {
    // register commands the extension provides
    commands.register(context);

    // add MCP server definition provider
    mcp.add(context);
}
