import * as vscode from 'vscode';
import * as mcp from './mcpserver/mcpserver';
import ContainerUseCli from './cli';
import Commands from './commands';

const extensionVersion = '0.1.0';


export async function activate(context: vscode.ExtensionContext) {
    const cli = new ContainerUseCli();

    // always check if container use is installed
    if (!await cli.isInstalled()) {
        vscode.window.showWarningMessage(
            'Container Use is not installed. Commands will not work until it is installed.',
            'Install Now'
        ).then((response) => {
            if (response === 'Install Now') {
                vscode.commands.executeCommand('container-use.install');
            }
        });
    }

    // get the current workspace
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        vscode.window.showErrorMessage('No workspace folder found. Please open a workspace to use Container Use commands.');
        return;
    }

    Commands.register(context, workspaceFolders[0].uri.fsPath);

    mcp.add(context, extensionVersion);
}
