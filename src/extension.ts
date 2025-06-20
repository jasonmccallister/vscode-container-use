import * as vscode from 'vscode';
import * as commands from './commands/commands';
import * as mcp from './mcpserver/mcpserver';
import { ContainerUseCli } from './cli';

const version = '0.1.0';

export function activate(context: vscode.ExtensionContext) {
    // if (!installed(context)) {
    //     vscode.window.showWarningMessage(
    //         'Container Use is not installed. Commands will not work until it is installed.',
    //         'Install Now'
    //     ).then((response) => {
    //         if (response === 'Install Now') {
    //             vscode.commands.executeCommand('container-use.install');
    //         }
    //     });

    //     return;
    // }

    // Register the extension version
    // register commands the extension provides
    commands.register(context);

    // add MCP server definition provider
    mcp.add(context, version);
}

/**
 * Checks if the cu binary is installed and shows a notification if it's not
 */
async function installed(context: vscode.ExtensionContext): Promise<boolean> {
    // Check if user has opted out of install notices
    const suppressNotice = context.globalState.get('containerUse.suppressInstallNotice', false);
    if (suppressNotice) {
        return true;
    }

    // Create a temporary CLI instance to check binary availability
    const cli = new ContainerUseCli('.');
    return await cli.validate();
}

export function deactivate() {
    // Clean up any resources when extension is deactivated
    commands.dispose();
}
