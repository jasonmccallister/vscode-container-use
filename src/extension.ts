import * as vscode from 'vscode';
import { registerTreeView } from './tree/provider';
import { registerInstallCommand } from './commands/install';
import { registerCopilotCommand } from './commands/copilot';
import { registerMcpConfigCommand } from './commands/mcp';
import { registerTerminalCommand } from './commands/terminal';
import { registerCheckoutCommand } from './commands/checkout';
import { registerMergeCommand } from './commands/merge';
import { registerDeleteCommand } from './commands/delete';
import { checkInstallation, InstallResult } from './utils/installation';
import { registerMcpServer } from './mcpserver/mcpserver';

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
        // Still register commands as fallback
        registerInstallCommand(context);
        registerCopilotCommand({ context });
        registerMcpConfigCommand(context);
    }
}

const activateExtension = async (context: vscode.ExtensionContext): Promise<void> => {
    // Register all commands (including install command for manual re-installation)
    registerInstallCommand(context);
    registerCopilotCommand({ context });
    registerMcpConfigCommand(context);
    registerTerminalCommand(context, { extensionPath: context.extensionPath });
    registerCheckoutCommand(context);
    registerMergeCommand(context);
    registerDeleteCommand(context);
    
    // Register MCP server only if auto-registration is enabled
    const config = vscode.workspace.getConfiguration('containerUse');
    const autoRegisterMcp = config.get<boolean>('autoRegisterMcpServer', true);
    
    if (autoRegisterMcp) {
        registerMcpServer({
            context,
            version: extensionVersion,
            serverId: 'container-use',
            command: 'cu',
            args: ['stdio']
        });
    }

    // Register tree view for environments
    registerTreeView(context);
};

const handleMissingInstallation = async (context: vscode.ExtensionContext, installResult: InstallResult): Promise<void> => {
    // Register available commands when Container Use is not installed
    registerInstallCommand(context);
    registerCopilotCommand({ context });
    registerMcpConfigCommand(context);
    registerTerminalCommand(context, { extensionPath: context.extensionPath });
    registerCheckoutCommand(context);
    registerMergeCommand(context);

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