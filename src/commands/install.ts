import * as vscode from 'vscode';
import { checkInstallation, InstallResult } from '../utils/installation';

export const registerInstallCommand = (context: vscode.ExtensionContext): void => {
    const installCommand = vscode.commands.registerCommand('container-use.install', async () => {
        try {
            const result = await checkInstallation();

            if (result.hasCorrectBinary) {
                vscode.window.showInformationMessage('Container Use is already installed and ready to use!');
                return;
            }

            await handleInstallation(result);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to check installation: ${error}`);
        }
    });

    context.subscriptions.push(installCommand);
};

const handleInstallation = async (result: InstallResult): Promise<void> => {
    const config = vscode.workspace.getConfiguration('containerUse');

    // Determine available installation methods
    const installMethods: string[] = [];
    const installLabels: string[] = [];

    if (result.hasHomebrew && (result.platform === 'darwin' || result.platform === 'linux')) {
        installMethods.push('brew');
        installLabels.push('Install using Homebrew (recommended)');
    }

    // Always add curl as an option
    installMethods.push('curl');
    installLabels.push('Install using curl script');

    if (installMethods.length === 0) {
        vscode.window.showErrorMessage('No suitable installation method found for your platform.');
        return;
    }

    // Show installation options to user
    const selectedMethod = await vscode.window.showQuickPick(
        installLabels.map((label, index) => ({
            label,
            value: installMethods[index]
        })),
        {
            placeHolder: 'Container Use is not installed. Please select an installation method:',
            canPickMany: false
        }
    );

    if (!selectedMethod) {
        return; // User cancelled
    }

    // Save the selected method to configuration
    await config.update('installMethod', selectedMethod.value, vscode.ConfigurationTarget.Global);

    // Show instructions based on selected method
    await showInstallationInstructions(selectedMethod.value);
};

const showInstallationInstructions = async (method: string): Promise<void> => {
    let instructions: string;
    let terminalCommand: string;

    switch (method) {
        case 'brew':
            instructions = 'Container Use will be installed using Homebrew. Please run the following command in your terminal:';
            terminalCommand = 'brew install container-use';
            break;
        case 'curl':
            instructions = 'Container Use will be installed using the curl script. Please run the following command in your terminal:';
            terminalCommand = 'curl -sSL https://install.container-use.com | sh';
            break;
        default:
            vscode.window.showErrorMessage('Unknown installation method selected.');
            return;
    }

    const action = await vscode.window.showInformationMessage(
        instructions,
        'Copy Command',
        'Open Terminal',
        'Cancel'
    );

    switch (action) {
        case 'Copy Command':
            await vscode.env.clipboard.writeText(terminalCommand);
            vscode.window.showInformationMessage('Installation command copied to clipboard!');
            break;
        case 'Open Terminal':
            const terminal = vscode.window.createTerminal('Container Use Installation');
            terminal.show();
            terminal.sendText(terminalCommand);
            break;
    }
};