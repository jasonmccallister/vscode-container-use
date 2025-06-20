import * as vscode from 'vscode';
import * as commands from './commands/commands';
import * as mcp from './mcpserver/mcpserver';
import { ContainerUseCli } from './cli';

const version = '0.1.0';

export function activate(context: vscode.ExtensionContext) {
    // Check if cu binary is installed and show notice if not
    const isInstalled = checkInstallation(context);

    if (!isInstalled) {
        vscode.window.showWarningMessage(
            'Container Use is not installed. Commands will not work until it is installed.',
            'Install Now'
        ).then((response) => {
            if (response === 'Install Now') {
                vscode.commands.executeCommand('container-use.install');
            }
        });

        return;
    }

    // Register the extension version
    // register commands the extension provides
    commands.register(context);

    // add MCP server definition provider
    mcp.add(context, version);


}

/**
 * Checks if the cu binary is installed and shows a notification if it's not
 */
async function checkInstallation(context: vscode.ExtensionContext): Promise<boolean> {
    try {
        // Check if user has opted out of install notices
        const suppressNotice = context.globalState.get('containerUse.suppressInstallNotice', false);
        if (suppressNotice) {
            return false;
        }

        // Create a temporary CLI instance to check binary availability
        const cli = new ContainerUseCli('.');
        const validationResult = await cli.validate();

        // If validation fails, the binary is not installed
        if (validationResult) {
            return false;
        }
    } catch (error) {
        // Silently handle errors during startup check to avoid disrupting extension activation
        console.error('Error checking Container Use binary installation:', error);

        return false;
    }

    // If we reach here, the binary is installed
    return true;
}

export function deactivate() {
    // Clean up any resources when extension is deactivated
    commands.dispose();
}
