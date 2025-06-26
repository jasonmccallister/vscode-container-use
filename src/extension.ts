import * as vscode from 'vscode';
import * as mcp from './mcpserver/mcpserver';
import { DataProvider } from './tree/provider';
import { registerInstallCommand } from './commands/install';

const extensionVersion = '0.1.0';

export function activate(context: vscode.ExtensionContext) {
    mcp.add(context, extensionVersion);

    // Register the install command
    registerInstallCommand(context);

    context.subscriptions.push(
        vscode.window.createTreeView('containerUseTreeView', {
            treeDataProvider: new DataProvider(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || ''),
        }),
    );
}