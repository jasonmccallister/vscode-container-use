import * as vscode from 'vscode';
import * as mcp from './mcpserver/mcpserver';
import { DataProvider } from './tree/provider';
import { registerInstallCommand } from './commands/install';
import { checkInstallation, InstallResult } from './utils/installation';

const extensionVersion = '0.1.0';

export async function activate(context: vscode.ExtensionContext) {
    try {
        // Check installation status before setting up commands and views
        const installResult = await checkInstallation();
        
        if (!installResult.hasCorrectBinary) {
            // Show installation prompt and register install command only
            await handleMissingInstallation(context, installResult);
            return;
        }

        // Container Use is properly installed, proceed with full activation
        await activateExtension(context);
        
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to activate Container Use extension: ${error}`);
        // Still register install command as fallback
        registerInstallCommand(context);
    }
}

const activateExtension = async (context: vscode.ExtensionContext): Promise<void> => {
    // Add MCP server functionality
    mcp.add(context, extensionVersion);

    // Register all commands (including install command for manual re-installation)
    registerInstallCommand(context);

    // Create tree view for environments
    context.subscriptions.push(
        vscode.window.createTreeView('containerUseTreeView', {
            treeDataProvider: new DataProvider(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || ''),
        }),
    );

    // Show success message
    vscode.window.showInformationMessage('Container Use extension activated successfully!');
};

const handleMissingInstallation = async (context: vscode.ExtensionContext, installResult: InstallResult): Promise<void> => {
    // Only register the install command when Container Use is not installed
    registerInstallCommand(context);

    // Determine available installation methods for the prompt
    const installMethods: string[] = [];
    if (installResult.hasHomebrew && (installResult.platform === 'darwin' || installResult.platform === 'linux')) {
        installMethods.push('Homebrew (recommended)');
    }
    installMethods.push('curl script');

    const methodText = installMethods.length > 1 
        ? `Available installation methods: ${installMethods.join(', ')}`
        : `Installation method: ${installMethods[0]}`;

    // Show installation prompt
    const action = await vscode.window.showWarningMessage(
        `Container Use is not installed or not properly configured. ${methodText}`,
        'Install Now',
        'Install Later',
        'Learn More'
    );

    switch (action) {
        case 'Install Now':
            // Trigger the install command
            await vscode.commands.executeCommand('container-use.install');
            break;
        case 'Learn More':
            vscode.env.openExternal(vscode.Uri.parse('https://github.com/jasonmccallister/container-use'));
            break;
        // 'Install Later' or no selection just continues without action
    }
};