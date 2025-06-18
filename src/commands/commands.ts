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
    listEnvironments(context);
    watch(context);
    merge(context);
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
            const binaryExists = await ensureBinaryExists('cu', 'stdio');

            if (!binaryExists) {
                // Check if user is on macOS and has brew installed first
                let installMethod = 'curl';
                let installPromptMessage = 'The "container-use" binary is not installed. Would you like to install it now?';
                let installOptions = ['Install', 'Cancel'];

                if (process.platform === 'darwin') {
                    // Check if brew is installed
                    const brewExists = await ensureBinaryExists('brew');

                    if (brewExists) {
                        installPromptMessage = 'The "container-use" binary is not installed. How would you like to install it?';
                        installOptions = ['Install using Homebrew (recommended)', 'Install using curl script'];
                    }
                }

                const installResponse = await vscode.window.showInformationMessage(
                    installPromptMessage,
                    { modal: true },
                    ...installOptions
                );

                if (installResponse === 'Cancel' || !installResponse) {
                    vscode.window.showInformationMessage('Installation cancelled.');
                    return;
                }

                // Determine install method based on response
                if (installResponse === 'Install using Homebrew (recommended)') {
                    installMethod = 'brew';
                } else if (installResponse === 'Install using curl script') {
                    installMethod = 'curl';
                } else if (installResponse === 'Install') {
                    installMethod = 'curl'; // Default for non-macOS or no brew
                }

                // Execute the installation command
                const terminal = vscode.window.createTerminal('Container Use Installation');
                terminal.show();

                let installCommand: string;
                if (installMethod === 'brew') {
                    installCommand = 'brew install dagger/tap/container-use';
                    vscode.window.showInformationMessage('Installing "container-use" via Homebrew... Check the terminal for progress.');
                } else {
                    installCommand = 'curl -fsSL https://raw.githubusercontent.com/dagger/container-use/main/install.sh | bash';
                    vscode.window.showInformationMessage('Installing "container-use" via curl script... Check the terminal for progress.');
                }

                terminal.sendText(installCommand);

                // Show option to verify installation after a delay
                setTimeout(async () => {
                    const verifyResponse = await vscode.window.showInformationMessage(
                        'Installation command has been executed. Would you like to verify if the binary was installed successfully?',
                        'Verify',
                        'Later'
                    );

                    if (verifyResponse === 'Verify') {
                        const binaryNowExists = await ensureBinaryExists('cu', 'stdio');
                        if (binaryNowExists) {
                            vscode.window.showInformationMessage('✅ "container-use" binary has been successfully installed!');
                        } else {
                            vscode.window.showWarningMessage('⚠️ "container-use" binary was not found. Please check the terminal output for any errors and ensure your PATH is updated.');
                        }
                    }
                }, 8000); // Wait 8 seconds for brew (slower than curl)
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
function instructions(context: vscode.ExtensionContext): void {
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

                await addFile(workspaceUri, '.github/copilot-instructions.md', instructionsContent);

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

function listEnvironments(context: vscode.ExtensionContext): void {
    context.subscriptions.push(vscode.commands.registerCommand('container-use.list', async () => {
        try {
            // open the terminal and run the cu list command
            const terminal = vscode.window.createTerminal('Container Use List');
            terminal.show();
            terminal.sendText('cu list', true);

        } catch (error) {
            vscode.window.showErrorMessage(error instanceof Error ? error.message : 'An unexpected error occurred');
        }
    }));
}

function watch(context: vscode.ExtensionContext): void {
    context.subscriptions.push(vscode.commands.registerCommand('container-use.watch', async () => {
        try {
            // open the terminal and run the cu watch command
            const terminal = vscode.window.createTerminal('Container Use Watch');
            terminal.show();
            terminal.sendText(`cu watch`, true);

        } catch (error) {
            vscode.window.showErrorMessage(error instanceof Error ? error.message : 'An unexpected error occurred');
        }
    }));
}

function merge(context: vscode.ExtensionContext): void {
    context.subscriptions.push(vscode.commands.registerCommand('container-use.merge', async () => {
        // TODO(jasonmccallister) get a list of all the environments by running the cu list command and prompt

        const environment = await vscode.window.showInputBox({
            prompt: 'Enter the environment to merge',
            placeHolder: 'my-example-environment',
            validateInput: (input) => {
                if (!input || input.trim() === '') {
                    return 'Environment name cannot be empty';
                }
                // run the cu list command to check if the environment exists and check the output
                const terminal = vscode.window.createTerminal('Container Use Validate Environment');
                terminal.sendText(`cu list`, true);
                
                // grab the actual terminal output for validation
                const output = terminal.processId ? terminal.processId.toString() : '';
                if (!output.includes(input)) {
                    return `Environment "${input}" does not exist. Please enter a valid environment name.`;
                }

                return null; // No error
            }
        });

        if (!environment) {
            vscode.window.showWarningMessage('No environment specified. Merge operation cancelled.');
            return;
        }

        try {
            // open the terminal and run the cu merge command
            const terminal = vscode.window.createTerminal('Container Use Merge');
            terminal.show();
            terminal.sendText(`cu merge ${environment}`, true);

        } catch (error) {
            vscode.window.showErrorMessage(error instanceof Error ? error.message : 'An unexpected error occurred');
        }
    }));
}