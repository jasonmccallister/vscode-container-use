import * as vscode from 'vscode';
import * as mcp from './mcpserver/mcpserver';
import { DataProvider } from './tree/provider';

const extensionVersion = '0.1.0';

export function activate(context: vscode.ExtensionContext) {
    mcp.add(context, extensionVersion);

    context.subscriptions.push(
        vscode.window.createTreeView('containerUseTreeView', {
            treeDataProvider: new DataProvider(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || ''),
        }),
    );
}