import * as vscode from 'vscode';
import { validate, addFile } from '../utils/workspace';
import { ensureBinaryExists } from '../fileOperations';
import { ContainerUseCli } from '../cli';
import { EnvironmentsPanel } from '../webview/environmentsPanel';

/**
 * Adds the commands for the Container Use extension.
 * @param {vscode.ExtensionContext} context - The extension context.
 */
export function register(context: vscode.ExtensionContext) {
    install(context);
    instructions(context);
    list(context);
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

function list(context: vscode.ExtensionContext): void {
    context.subscriptions.push(vscode.commands.registerCommand('container-use.list', async () => {
        try {
            // Validate workspace folder exists
            const workspaceUri = validate();
            
            // Create CLI instance
            const cli = new ContainerUseCli(workspaceUri.fsPath);
            
            // Show progress while fetching environments
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Container Use: Fetching environments...',
                cancellable: false
            }, async () => {
                const result = await cli.list();

                if (!result.success) {
                    vscode.window.showErrorMessage(`Failed to get environments: ${result.error}`);
                    return;
                }

                const environments = result.data || [];
                
                // Create or show the environments panel
                EnvironmentsPanel.createOrShow(context.extensionUri, environments);
                
                if (environments.length === 0) {
                    vscode.window.showInformationMessage('No environments found.');
                } else {
                    vscode.window.showInformationMessage(`Found ${environments.length} environment(s). Check the Container Use panel for details.`);
                }
            });

        } catch (error) {
            vscode.window.showErrorMessage(error instanceof Error ? error.message : 'An unexpected error occurred');
        }
    }));
}

function watch(context: vscode.ExtensionContext): void {
    context.subscriptions.push(vscode.commands.registerCommand('container-use.watch', async () => {
        try {
            // For watch command, we'll still use terminal since it's a long-running process
            // But we could also validate the workspace first
            const workspaceUri = validate();
            
            // Check if cu binary exists
            const binaryExists = await ensureBinaryExists('cu', 'stdio');
            if (!binaryExists) {
                vscode.window.showErrorMessage('The "container-use" binary is not installed. Please install it first using the "Container Use: Install" command.');
                return;
            }

            // open the terminal and run the cu watch command
            const terminal = vscode.window.createTerminal({
                name: 'Container Use Watch',
                cwd: workspaceUri.fsPath
            });
            terminal.show();
            terminal.sendText(`cu watch`, true);

        } catch (error) {
            vscode.window.showErrorMessage(error instanceof Error ? error.message : 'An unexpected error occurred');
        }
    }));
}

function merge(context: vscode.ExtensionContext): void {
    context.subscriptions.push(vscode.commands.registerCommand('container-use.merge', async () => {
        try {
            // First, check if cu binary exists
            const binaryExists = await ensureBinaryExists('cu', 'stdio');
            if (!binaryExists) {
                vscode.window.showErrorMessage('The "container-use" binary is not installed. Please install it first using the "Container Use: Install" command.');
                return;
            }

            // Show loading message while fetching environments
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Container Use: Fetching environments...',
                cancellable: false
            }, async () => {
                // Validate workspace folder exists
                const workspaceUri = validate();
                
                // Create CLI instance
                const cli = new ContainerUseCli(workspaceUri.fsPath);
                
                // Get list of environments
                const result = await cli.list();

                if (!result.success) {
                    vscode.window.showErrorMessage(`Failed to get environments: ${result.error}`);
                    return;
                }

                if (!result.data || result.data.length === 0) {
                    vscode.window.showWarningMessage('No environments found. Make sure you have created some environments first.');
                    return;
                }

                // Show quick pick with environments
                const selectedEnvironment = await vscode.window.showQuickPick(result.data, {
                    placeHolder: 'Select an environment to merge',
                    title: 'Container Use: Merge Environment'
                });

                if (!selectedEnvironment) {
                    vscode.window.showInformationMessage('No environment selected. Merge operation cancelled.');
                    return;
                }

                // Execute merge command with progress
                await vscode.window.withProgress({
                    location: vscode.ProgressLocation.Notification,
                    title: `Container Use: Merging environment "${selectedEnvironment}"...`,
                    cancellable: false
                }, async () => {
                    const mergeResult = await cli.merge(selectedEnvironment);

                    if (mergeResult.success) {
                        vscode.window.showInformationMessage(`✅ Successfully merged environment "${selectedEnvironment}"`);
                        if (mergeResult.stdout) {
                            // Show output in output channel for detailed information
                            const outputChannel = vscode.window.createOutputChannel('Container Use');
                            outputChannel.appendLine(`Merge output for "${selectedEnvironment}":`);
                            outputChannel.appendLine(mergeResult.stdout);
                            outputChannel.show();
                        }
                    } else {
                        vscode.window.showErrorMessage(`❌ Failed to merge environment "${selectedEnvironment}": ${mergeResult.error || 'Unknown error'}`);
                        if (mergeResult.stdout || mergeResult.stderr) {
                            // Show error details in output channel
                            const outputChannel = vscode.window.createOutputChannel('Container Use');
                            outputChannel.appendLine(`Merge failed for "${selectedEnvironment}":`);
                            if (mergeResult.stdout) {
                                outputChannel.appendLine('Output:');
                                outputChannel.appendLine(mergeResult.stdout);
                            }
                            if (mergeResult.stderr) {
                                outputChannel.appendLine('Error:');
                                outputChannel.appendLine(mergeResult.stderr);
                            }
                            outputChannel.show();
                        }
                    }
                });
            });

        } catch (error) {
            vscode.window.showErrorMessage(error instanceof Error ? error.message : 'An unexpected error occurred');
        }
    }));
}