import * as vscode from 'vscode';
import { validate, addFile } from '../utils/workspace';
import { ensureBinaryExists } from '../fileOperations';

/**
 * Adds the commands for the Container Use extension.
 * @param {vscode.ExtensionContext} context - The extension context.
 */
export function addCommands(context: vscode.ExtensionContext) {
    install(context);
    instructions(context);
}

/**
 * Prompts the user to install the container-use binary if it is not found.
 * If the binary is not found, it shows an error message and suggests installation.
 * @returns {Promise<void>} A promise that resolves when the user has been prompted.
 */
function install(context: vscode.ExtensionContext): void {
    const didChangeEmitter = new vscode.EventEmitter<void>();

    context.subscriptions.push(vscode.commands.registerCommand('container-use.install', async () => {
        try {
            // Check if the container-use binary exists
            const binaryExists = ensureBinaryExists('cu');

            if (!binaryExists) {
                const installResponse = await vscode.window.showInformationMessage(
                    'The "container-use" binary is not installed. Would you like to install it now?',
                    { modal: true },
                    'Install',
                    'Cancel'
                );

                if (installResponse === 'Install') {
                    // Here you would implement the installation logic, e.g., downloading the binary
                    // For now, we will just show a message
                    vscode.window.showInformationMessage('Installing "container-use" binary... (this is a placeholder)');
                } else {
                    vscode.window.showInformationMessage('Installation cancelled.');
                }
            } else {
                vscode.window.showInformationMessage('"container-use" binary is already installed.');
            }

            didChangeEmitter.fire();
        } catch (error) {
            vscode.window.showErrorMessage(error instanceof Error ? error.message : 'An unexpected error occurred');
        }
    }));
}

/**
 * Registers the command to add Copilot instructions for Container Use.
 * This command prompts the user to add instructions and creates a file with those instructions.
 * @param {vscode.ExtensionContext} context - The extension context.
 */
function instructions(context: vscode.ExtensionContext) : void {
    const didChangeEmitter = new vscode.EventEmitter<void>();

    context.subscriptions.push(vscode.commands.registerCommand('container-use.instructions', async () => {
        try {
            // Validate workspace folder exists
            const workspaceUri = validate();

            // Ask user about Copilot instructions
            const addInstructions = await vscode.window.showInformationMessage(
                'Would you like to add the (optional) Copilot instructions for Container Use?',
                { modal: true },
                'Yes',
                'No'
            );

            if (addInstructions === 'Yes') {
                const instructionsContent = `ALWAYS use ONLY Environments for ANY and ALL file, code, or shell operations—NO EXCEPTIONS—even for simple or generic requests.
            
            DO NOT install or use the git cli with the environment_run_cmd tool. All environment tools will handle git operations for you. Changing ".git" yourself will compromise the integrity of your environment.
            
            You MUST inform the user how to view your work using \`git checkout <branch_name>\`. Failure to do this will make your work inaccessible to others.`;

                await addFile(vscode.Uri.joinPath(workspaceUri, '.github', 'copilot-instructions.md').toString(), instructionsContent);
                vscode.window.showInformationMessage('Copilot instructions added at .github/copilot-instructions.md');
            } else {
                vscode.window.showInformationMessage('Copilot instructions not added.');
            }

            didChangeEmitter.fire();
        } catch (error) {
            vscode.window.showErrorMessage(error instanceof Error ? error.message : 'An unexpected error occurred');
        }
    }));
}
