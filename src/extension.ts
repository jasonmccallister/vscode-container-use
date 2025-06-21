import * as vscode from 'vscode';
import * as mcp from './mcpserver/mcpserver';
import ContainerUseCli from './cli';
import Commands from './commands';

const extensionVersion = '0.1.0';

export async function activate(context: vscode.ExtensionContext) {
    // Always register commands first so they're available
    // get the current workspace
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        vscode.window.showErrorMessage('No workspace folder found. Please open a workspace to use Container Use commands.');
        return;
    }

    Commands.register(context, workspaceFolders[0].uri.fsPath);

    // Check installation status and show prompt if needed
    await checkInstallationAndPrompt(context);

    mcp.add(context, extensionVersion);
}

/**
 * Checks if Container Use is installed and shows install prompt if needed
 */
async function checkInstallationAndPrompt(context: vscode.ExtensionContext) {
    try {
        const cli = new ContainerUseCli();
        const isInstalled = await cli.isInstalled();
        
        if (!isInstalled) {
            // Check if user has permanently dismissed the install notice
            const suppressNotice = context.globalState.get('containerUse.suppressInstallNotice', false);
            
            if (!suppressNotice) {
                const response = await vscode.window.showWarningMessage(
                    'Container Use is not installed. Commands will not work until it is installed.',
                    'Install Now',
                    'Don\'t Show Again',
                    'Remind Me Later'
                );

                if (response === 'Install Now') {
                    vscode.commands.executeCommand('container-use.install');
                } else if (response === 'Don\'t Show Again') {
                    await context.globalState.update('containerUse.suppressInstallNotice', true);
                }
                // If "Remind Me Later" or dismissed, do nothing - will check again on command usage
            }
        }
    } catch (error) {
        // Silently handle errors during installation check to avoid disrupting activation
        console.error('Error checking Container Use installation:', error);
    }
}

/**
 * Checks installation before running commands and prompts if needed
 * This can be called by individual commands to ensure binary is available
 */
export async function ensureInstalled(context: vscode.ExtensionContext): Promise<boolean> {
    try {
        const cli = new ContainerUseCli();
        const isInstalled = await cli.isInstalled();
        
        if (!isInstalled) {
            const response = await vscode.window.showWarningMessage(
                'Container Use is not installed. This command requires the Container Use binary.',
                'Install Now',
                'Cancel'
            );

            if (response === 'Install Now') {
                await vscode.commands.executeCommand('container-use.install');
                // After install attempt, check again
                return await cli.isInstalled();
            }
            return false;
        }
        
        return true;
    } catch (error) {
        vscode.window.showErrorMessage(`Error checking Container Use installation: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return false;
    }
}
