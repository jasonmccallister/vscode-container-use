import * as vscode from 'vscode';
import * as mcp from './mcpserver/mcpserver';
import ContainerUseCli from './cli';
import installCommand from './install';
import listCommand from './list';
import logCommand from './log';

const extensionVersion = '0.1.0';

async function isInstalled(): Promise<boolean> {
    return await (new ContainerUseCli()).isInstalled();
}

export function activate(context: vscode.ExtensionContext) {
    // always check if container use is installed
    if (!isInstalled()) {
        vscode.window.showWarningMessage(
            'Container Use is not installed. Commands will not work until it is installed.',
            'Install Now'
        ).then((response) => {
            if (response === 'Install Now') {
                vscode.commands.executeCommand('container-use.install');
            }
        });
    }

    installCommand(context);
    listCommand(context);
    logCommand(context);

    mcp.add(context, extensionVersion);
}
