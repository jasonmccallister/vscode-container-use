import * as vscode from 'vscode';
import * as mcp from './mcpserver/mcpserver';

const extensionVersion = '0.1.0';

export async function activate(context: vscode.ExtensionContext) {

    mcp.add(context, extensionVersion);
}