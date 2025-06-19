import * as vscode from 'vscode';
import * as commands from './commands/commands';
import * as mcp from './mcpserver/mcpserver';
import { ContainerUseCli } from './cli';

export function activate(context: vscode.ExtensionContext) {
    // register commands the extension provides
    commands.register(context);

    // add MCP server definition provider
    mcp.add(context);

    // Check if cu binary is installed and show notice if not
    checkInstallation(context);
}

/**
 * Checks if the cu binary is installed and shows a notification if it's not
 */
async function checkInstallation(context: vscode.ExtensionContext): Promise<void> {
    try {
        // Check if user has opted out of install notices
        const suppressNotice = context.globalState.get('containerUse.suppressInstallNotice', false);
        if (suppressNotice) {
            return;
        }

        // Create a temporary CLI instance to check binary availability
        const cli = new ContainerUseCli('.');
        const validationResult = await cli.validate();
        
        // If validation fails, the binary is not installed
        if (validationResult) {
            const installResponse = await vscode.window.showInformationMessage(
                '⚠️ Container Use is not installed. Would you like to install it?',
                'Install Now',
                'Install Later',
                'Don\'t Show Again'
            );

            if (installResponse === 'Install Now') {
                // Run the install command
                await vscode.commands.executeCommand('container-use.install');
            } else if (installResponse === 'Don\'t Show Again') {
                // Store preference to not show this notice again
                await context.globalState.update('containerUse.suppressInstallNotice', true);
            }
        }
    } catch (error) {
        // Silently handle errors during startup check to avoid disrupting extension activation
        console.error('Error checking Container Use binary installation:', error);
    }
}

export function deactivate() {
    // Clean up any resources when extension is deactivated
    commands.dispose();
}
