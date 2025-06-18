import * as vscode from 'vscode';
import { validate, addFile } from '../utils/workspace';
import { ensureBinaryExists } from '../fileOperations';
import { spawn } from 'child_process';

/**
 * Executes the cu list command and returns the list of environments
 * @param workspacePath The workspace directory path to run the command in
 * @returns A promise that resolves to an object with environments array and error information
 */
async function getEnvironmentList(workspacePath: string): Promise<{ environments: string[]; success: boolean; error?: string }> {
    return new Promise((resolve) => {
        try {
            const process = spawn('cu', ['list'], {
                stdio: ['ignore', 'pipe', 'pipe'],
                cwd: workspacePath
            });

            let stdout = '';
            let stderr = '';

            process.stdout?.on('data', (data) => {
                stdout += data.toString();
            });

            process.stderr?.on('data', (data) => {
                stderr += data.toString();
            });

            process.on('close', (code) => {
                if (stderr) {
                    console.error('cu list stderr:', stderr); // Debug logging
                }

                if (code === 0) {
                    console.log('cu list raw output:', JSON.stringify(stdout)); // Debug logging
                    
                    // Parse the output to extract environment names
                    const lines = stdout.split('\n');
                    const environments: string[] = [];
                    
                    for (const line of lines) {
                        const trimmedLine = line.trim();
                        
                        // Skip empty lines
                        if (!trimmedLine) {
                            continue;
                        }
                        
                        // For the format "go-api-request-info/growing-squirrel", we want the whole line
                        // Split by whitespace and take the first part (environment name)
                        const parts = trimmedLine.split(/\s+/);
                        const envName = parts[0];
                        
                        // Make sure it's a valid environment name
                        if (envName && envName.length > 0) {
                            environments.push(envName);
                        }
                    }
                    
                    console.log('Parsed environments:', environments); // Debug logging
                    resolve({ environments, success: true });
                } else {
                    console.error(`cu list command failed with code ${code}: ${stderr}`);
                    const errorMessage = stderr || `Command failed with exit code ${code}`;
                    resolve({ environments: [], success: false, error: errorMessage });
                }
            });

            process.on('error', (error) => {
                console.error('Error executing cu list command:', error);
                resolve({ environments: [], success: false, error: error.message });
            });

            // Set a timeout to avoid hanging
            setTimeout(() => {
                process.kill();
                resolve({ environments: [], success: false, error: 'Command timed out after 10 seconds' });
            }, 10000); // 10 second timeout

        } catch (error) {
            console.error('Error executing cu list command:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            resolve({ environments: [], success: false, error: errorMessage });
        }
    });
}

/**
 * Executes the cu merge command for a specific environment
 * @param environment The environment name to merge
 * @returns A promise that resolves when the command completes
 */
async function executeMergeCommand(environment: string): Promise<{ success: boolean; output: string; error?: string }> {
    return new Promise((resolve) => {
        try {
            const process = spawn('cu', ['merge', environment], {
                stdio: ['ignore', 'pipe', 'pipe']
            });

            let stdout = '';
            let stderr = '';

            process.stdout?.on('data', (data) => {
                stdout += data.toString();
            });

            process.stderr?.on('data', (data) => {
                stderr += data.toString();
            });

            process.on('close', (code) => {
                if (code === 0) {
                    resolve({ success: true, output: stdout });
                } else {
                    resolve({ success: false, output: stdout, error: stderr });
                }
            });

            process.on('error', (error) => {
                resolve({ success: false, output: '', error: error.message });
            });

            // Set a timeout to avoid hanging
            setTimeout(() => {
                process.kill();
                resolve({ success: false, output: '', error: 'Command timed out' });
            }, 30000); // 30 second timeout for merge

        } catch (error) {
            resolve({ success: false, output: '', error: error instanceof Error ? error.message : 'Unknown error' });
        }
    });
}

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
                
                // Get list of environments
                const result = await getEnvironmentList(workspaceUri.fsPath);

                if (!result.success) {
                    vscode.window.showErrorMessage(`Failed to get environments: ${result.error}`);
                    return;
                }

                if (result.environments.length === 0) {
                    vscode.window.showWarningMessage('No environments found. Make sure you have created some environments first.');
                    return;
                }

                // Show quick pick with environments
                const selectedEnvironment = await vscode.window.showQuickPick(result.environments, {
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
                    const result = await executeMergeCommand(selectedEnvironment);

                    if (result.success) {
                        vscode.window.showInformationMessage(`✅ Successfully merged environment "${selectedEnvironment}"`);
                        if (result.output) {
                            // Show output in output channel for detailed information
                            const outputChannel = vscode.window.createOutputChannel('Container Use');
                            outputChannel.appendLine(`Merge output for "${selectedEnvironment}":`);
                            outputChannel.appendLine(result.output);
                            outputChannel.show();
                        }
                    } else {
                        vscode.window.showErrorMessage(`❌ Failed to merge environment "${selectedEnvironment}": ${result.error || 'Unknown error'}`);
                        if (result.output || result.error) {
                            // Show error details in output channel
                            const outputChannel = vscode.window.createOutputChannel('Container Use');
                            outputChannel.appendLine(`Merge failed for "${selectedEnvironment}":`);
                            if (result.output) {
                                outputChannel.appendLine('Output:');
                                outputChannel.appendLine(result.output);
                            }
                            if (result.error) {
                                outputChannel.appendLine('Error:');
                                outputChannel.appendLine(result.error);
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