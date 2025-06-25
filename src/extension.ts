import * as vscode from 'vscode';
import * as mcp from './mcpserver/mcpserver';
import ContainerUseCli from './cli';
import Commands from './commands';
import { PromptToInstall } from './actions/promptInstall';

const extensionVersion = '0.1.0';

export async function activate(context: vscode.ExtensionContext) {
    let workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';

    Commands.register(context, workspacePath);

    // Check installation status and show prompt if needed
    await PromptToInstall.show(context);

    mcp.add(context, extensionVersion);
}