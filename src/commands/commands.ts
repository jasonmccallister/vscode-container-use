import * as vscode from 'vscode';
import { validate, addFile } from '../utils/workspace';
import { exists } from '../utils/executable';
import { ContainerUseCli } from '../cli';
import { OutputChannel } from '../output/output';

const homebrewOption = 'Use Homebrew (recommended)';
const curlOption = 'Use curl script';
const brewInstallCommand = 'brew install dagger/tap/container-use';
const curlInstallCommand = 'curl -fsSL https://raw.githubusercontent.com/dagger/container-use/main/install.sh | bash';
const instructionsContent = `ALWAYS use ONLY Environments for ANY and ALL file, code, or shell operations—NO EXCEPTIONS—even for simple or generic requests.
            
            DO NOT install or use the git cli with the environment_run_cmd tool. All environment tools will handle git operations for you. Changing ".git" yourself will compromise the integrity of your environment.
            
            You MUST inform the user how to view your work using \`git checkout <branch_name>\`. Failure to do this will make your work inaccessible to others.`;

// make a custom type for install method
type InstallMethod = 'brew' | 'curl';

/**
 * Logger helper to write messages to the Container Use output channel without showing notifications
 */
class Logger {
    private static outputChannel: vscode.OutputChannel | undefined;

    public static log(message: string) {
        if (!Logger.outputChannel) {
            Logger.outputChannel = vscode.window.createOutputChannel('Container Use');
        }
        Logger.outputChannel.appendLine(`[${new Date().toLocaleTimeString()}] ${message}`);
    }

    public static dispose() {
        if (Logger.outputChannel) {
            Logger.outputChannel.dispose();
            Logger.outputChannel = undefined;
        }
    }
}

/**
 * Container Use Commands class that manages all extension commands
 */
export class ContainerUseCommands {
    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    /**
     * Registers all commands for the Container Use extension
     */
    register(): void {
        this.install();
        this.instructions();
        this.list();
        this.watch();
        this.merge();
        this.terminal();
        this.delete();
        this.log();
        this.doctor();
        this.resetPreferences();
    }

    /**
     * Disposes of any resources created by the commands
     */
    dispose(): void {
        Logger.dispose();
    }

    /**
     * Handles the install command for the container-use binary.
     * If the binary is not found, it shows an error message and suggests installation.
     */
    private install(): void {
        const didChangeEmitter = new vscode.EventEmitter<void>();

        this.context.subscriptions.push(vscode.commands.registerCommand('container-use.install', async () => {
            try {
                // Check if the container-use binary exists
                const binaryExists = await exists('cu');

                if (!binaryExists) {
                    // Get the saved install method preference
                    const config = vscode.workspace.getConfiguration('containerUse');
                    let savedInstallMethod = config.get<string>('installMethod', '');
                    
                    let installMethod: InstallMethod = 'curl';
                    let installPromptMessage = 'Container Use is not installed. Would you like to install it now?';
                    let installOptions = ['Install', 'Cancel'];

                    // Check if we have a saved preference and if the method is available
                    if (savedInstallMethod === 'brew' || savedInstallMethod === 'curl') {
                        // Validate that the saved method is still available
                        if (savedInstallMethod === 'brew') {
                            // Check if brew is available on this platform
                            if ((process.platform === 'darwin' || process.platform === 'linux') && await exists('brew')) {
                                installMethod = 'brew';
                                installPromptMessage = 'Container Use is not installed. Install using your preferred method (Homebrew)?';
                                installOptions = ['Install with Homebrew', 'Choose Different Method', 'Cancel'];
                            } else {
                                // Reset saved preference if brew is not available
                                await config.update('installMethod', '', vscode.ConfigurationTarget.Global);
                                savedInstallMethod = '';
                            }
                        } else if (savedInstallMethod === 'curl') {
                            installMethod = 'curl';
                            installPromptMessage = 'Container Use is not installed. Install using your preferred method (curl script)?';
                            installOptions = ['Install with curl', 'Choose Different Method', 'Cancel'];
                        }
                    }

                    // If no saved preference or saved method is not available, show all options
                    if (!savedInstallMethod) {
                        // brew is available on macOS and Linux
                        if (process.platform === 'darwin' || process.platform === 'linux') {
                            if (await exists('brew')) {
                                installOptions = [homebrewOption, curlOption];
                            }
                        }
                    }

                    const installResponse = await vscode.window.showInformationMessage(
                        installPromptMessage,
                        { modal: true },
                        ...installOptions
                    );

                    if (installResponse === 'Cancel' || !installResponse) {
                        Logger.log('Installation cancelled by user.');
                        return;
                    }

                    // Handle responses and update preferences
                    if (installResponse === 'Choose Different Method') {
                        // Show all available options
                        const methodOptions = [];
                        if ((process.platform === 'darwin' || process.platform === 'linux') && await exists('brew')) {
                            methodOptions.push(homebrewOption);
                        }
                        methodOptions.push(curlOption);

                        const methodResponse = await vscode.window.showQuickPick(methodOptions, {
                            placeHolder: 'Select installation method',
                            title: 'Container Use: Choose Installation Method'
                        });

                        if (!methodResponse) {
                            Logger.log('Installation cancelled by user.');
                            return;
                        }

                        if (methodResponse === homebrewOption) {
                            installMethod = 'brew';
                            await config.update('installMethod', 'brew', vscode.ConfigurationTarget.Global);
                        } else if (methodResponse === curlOption) {
                            installMethod = 'curl';
                            await config.update('installMethod', 'curl', vscode.ConfigurationTarget.Global);
                        }
                    } else if (installResponse === homebrewOption || installResponse === 'Install with Homebrew') {
                        installMethod = 'brew';
                        await config.update('installMethod', 'brew', vscode.ConfigurationTarget.Global);
                    } else if (installResponse === curlOption || installResponse === 'Install with curl') {
                        installMethod = 'curl';
                        await config.update('installMethod', 'curl', vscode.ConfigurationTarget.Global);
                    } else if (installResponse === 'Install') {
                        installMethod = 'curl'; // Default for non-macOS or no brew
                        await config.update('installMethod', 'curl', vscode.ConfigurationTarget.Global);
                    }

                    // Execute the installation command
                    const terminal = vscode.window.createTerminal('Container Use');
                    terminal.show();

                    let installCommand: string;
                    if (installMethod === 'brew') {
                        installCommand = brewInstallCommand;
                        Logger.log('Installing "container-use" via Homebrew... Check the terminal for progress.');
                    } else {
                        installCommand = curlInstallCommand;
                        Logger.log('Installing "container-use" via curl script... Check the terminal for progress.');
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
                            if (await exists('cu', [], 'stdio')) {
                                Logger.log('✅ Container Use has been successfully installed!');
                            } else {
                                vscode.window.showWarningMessage('⚠️ Container Use was not found. Please check the terminal output for any errors and ensure your PATH is updated.');
                            }
                        }
                    }, 8000); // Wait 8 seconds for brew (slower than curl)
                } else {
                    Logger.log('Container Use is already installed.');
                }

                didChangeEmitter.fire();
            } catch (error) {
                vscode.window.showErrorMessage(error instanceof Error ? error.message : 'An unexpected error occurred');
            }
        }));
    }

    /**
     * Handles the instructions command to add Copilot instructions for Container Use.
     * This command prompts the user to add instructions and creates a file with those instructions.
     */
    private instructions(): void {
        const didChangeEmitter = new vscode.EventEmitter<void>();

        this.context.subscriptions.push(vscode.commands.registerCommand('container-use.instructions', async () => {
            try {
                // Validate workspace folder exists
                const workspaceUri = validate();

                // Ask user about Copilot instructions
                const addInstructions = await vscode.window.showInformationMessage(
                    'Add the (optional) Copilot instructions for Container Use?',
                    { modal: true },
                    'Yes',
                    'No'
                );

                if (addInstructions === 'Yes') {
                    await addFile(workspaceUri, '.github/copilot-instructions.md', instructionsContent);

                    Logger.log('Copilot instructions added at .github/copilot-instructions.md');
                } else {
                    Logger.log('Copilot instructions not added.');
                }

                didChangeEmitter.fire();
            } catch (error) {
                vscode.window.showErrorMessage(error instanceof Error ? error.message : 'An unexpected error occurred');
            }
        }));
    }

    /**
     * Handles the list command to display all available environments.
     */
    private list(): void {
        this.context.subscriptions.push(vscode.commands.registerCommand('container-use.list', async () => {
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

                    // Show environments in the bottom panel
                    OutputChannel.show(environments);

                    if (environments.length === 0) {
                        Logger.log('No environments found. Check the Container Use panel for details.');
                    } else {
                        Logger.log(`Found ${environments.length} environment(s). Check the Container Use panel for details.`);
                    }
                });

            } catch (error) {
                vscode.window.showErrorMessage(error instanceof Error ? error.message : 'An unexpected error occurred');
            }
        }));
    }

    /**
     * Handles the watch command to start container-use in watch mode.
     */
    private watch(): void {
        this.context.subscriptions.push(vscode.commands.registerCommand('container-use.watch', async () => {
            try {
                // Validate workspace folder exists
                const workspaceUri = validate();

                // Create CLI instance and validate cu binary
                const cli = new ContainerUseCli(workspaceUri.fsPath);
                const isValid = await cli.validate();
                if (!isValid) {
                    vscode.window.showErrorMessage('Container Use binary not found. Please install it first.');
                    return;
                }

                // Create terminal and run cu watch command
                const terminal = vscode.window.createTerminal({
                    name: 'Container Use Watch',
                    cwd: workspaceUri.fsPath
                });
                terminal.show();
                terminal.sendText('cu watch', true);

                Logger.log('Container Use watch mode started in terminal.');

            } catch (error) {
                vscode.window.showErrorMessage(error instanceof Error ? error.message : 'An unexpected error occurred');
            }
        }));
    }

    /**
     * Handles the merge command to merge a selected environment.
     */
    private merge(): void {
        this.context.subscriptions.push(vscode.commands.registerCommand('container-use.merge', async () => {
            try {
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

                    // Get list of environments (this will validate cu binary internally)
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
                        Logger.log('No environment selected. Merge operation cancelled.');
                        return;
                    }

                    // Execute merge command with progress
                    let mergeResult: any;
                    await vscode.window.withProgress({
                        location: vscode.ProgressLocation.Notification,
                        title: `Container Use: Merging environment "${selectedEnvironment}"...`,
                        cancellable: false
                    }, async () => {
                        mergeResult = await cli.merge(selectedEnvironment);
                    });

                    if (mergeResult.success) {
                        Logger.log(`✅ Successfully merged environment "${selectedEnvironment}"`);
                        if (mergeResult.stdout) {
                            // Show output in output channel for detailed information
                            const outputChannel = vscode.window.createOutputChannel('Container Use');
                            outputChannel.appendLine(`Merge output for "${selectedEnvironment}":`);
                            outputChannel.appendLine(mergeResult.stdout);
                            outputChannel.show();
                        }

                        // Ask if user wants to delete the environment after successful merge
                        const deleteAfterMerge = await vscode.window.showInformationMessage(
                            `Environment "${selectedEnvironment}" has been successfully merged. Would you like to delete the environment now?`,
                            'Delete Environment',
                            'Keep Environment'
                        );

                        if (deleteAfterMerge === 'Delete Environment') {
                            // Delete the environment
                            await vscode.window.withProgress({
                                location: vscode.ProgressLocation.Notification,
                                title: `Container Use: Deleting environment "${selectedEnvironment}"...`,
                                cancellable: false
                            }, async () => {
                                const deleteResult = await cli.delete(selectedEnvironment);

                                if (deleteResult.success) {
                                    Logger.log(`✅ Successfully deleted environment "${selectedEnvironment}"`);
                                } else {
                                    vscode.window.showErrorMessage(`❌ Failed to delete environment "${selectedEnvironment}": ${deleteResult.error || 'Unknown error'}`);
                                }
                            });
                        } else {
                            Logger.log(`Environment "${selectedEnvironment}" was kept after merge.`);
                        }
                    } else {
                        vscode.window.showErrorMessage(`❌ Failed to merge environment "${selectedEnvironment}": ${mergeResult.error || 'Unknown error'}`);
                        if (mergeResult.stdout || mergeResult.stderr) {                        // Show error details in output channel
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

            } catch (error) {
                vscode.window.showErrorMessage(error instanceof Error ? error.message : 'An unexpected error occurred');
            }
        }));
    }

    /**
     * Handles the terminal command to open a terminal for a selected environment.
     */
    private terminal(): void {
        this.context.subscriptions.push(vscode.commands.registerCommand('container-use.terminal', async () => {
            try {
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

                    // Get list of environments (this will validate cu binary internally)
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
                        placeHolder: 'Select an environment to open in terminal',
                        title: 'Container Use: Open Environment Terminal'
                    });

                    if (!selectedEnvironment) {
                        Logger.log('No environment selected. Terminal operation cancelled.');
                        return;
                    }

                    // Create terminal and run cu terminal command with selected environment
                    const terminal = vscode.window.createTerminal({
                        name: `Container Use Terminal - ${selectedEnvironment}`,
                        cwd: workspaceUri.fsPath
                    });
                    terminal.show();
                    terminal.sendText(`cu terminal ${selectedEnvironment}`, true);

                    Logger.log(`✅ Opened terminal for environment "${selectedEnvironment}"`);
                });

            } catch (error) {
                vscode.window.showErrorMessage(error instanceof Error ? error.message : 'An unexpected error occurred');
            }
        }));
    }

    /**
     * Handles the delete command to remove a selected environment.
     */
    private delete(): void {
        this.context.subscriptions.push(vscode.commands.registerCommand('container-use.delete', async () => {
            try {
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
                    placeHolder: 'Select an environment to delete',
                    title: 'Container Use: Delete Environment'
                });

                if (!selectedEnvironment) {
                    Logger.log('No environment selected. Delete operation cancelled.');
                    return;
                }

                // Confirm deletion
                const confirmDelete = await vscode.window.showWarningMessage(
                    `Are you sure you want to delete the environment "${selectedEnvironment}"? This action cannot be undone.`,
                    { modal: true },
                    'Delete',
                    'Cancel'
                );

                if (confirmDelete !== 'Delete') {
                    Logger.log('Environment deletion cancelled.');
                    return;
                }

                // Execute delete command with progress
                await vscode.window.withProgress({
                    location: vscode.ProgressLocation.Notification,
                    title: `Container Use: Deleting environment "${selectedEnvironment}"...`,
                    cancellable: false
                }, async () => {
                    const deleteResult = await cli.delete(selectedEnvironment);

                    if (deleteResult.success) {
                        Logger.log(`✅ Successfully deleted environment "${selectedEnvironment}"`);
                        if (deleteResult.stdout) {
                            // Show output in output channel for detailed information
                            const outputChannel = vscode.window.createOutputChannel('Container Use');
                            outputChannel.appendLine(`Delete output for "${selectedEnvironment}":`);
                            outputChannel.appendLine(deleteResult.stdout);
                            outputChannel.show();
                        }
                    } else {
                        vscode.window.showErrorMessage(`❌ Failed to delete environment "${selectedEnvironment}": ${deleteResult.error || 'Unknown error'}`);
                        if (deleteResult.stdout || deleteResult.stderr) {
                            // Show error details in output channel
                            const outputChannel = vscode.window.createOutputChannel('Container Use');
                            outputChannel.appendLine(`Delete failed for "${selectedEnvironment}":`);
                            if (deleteResult.stdout) {
                                outputChannel.appendLine('Output:');
                                outputChannel.appendLine(deleteResult.stdout);
                            }
                            if (deleteResult.stderr) {
                                outputChannel.appendLine('Error:');
                                outputChannel.appendLine(deleteResult.stderr);
                            }
                            outputChannel.show();
                        }
                    }
                });
            } catch (error) {
                vscode.window.showErrorMessage(error instanceof Error ? error.message : 'An unexpected error occurred');
            }
        }));
    }

    /**
     * Handles the log command to view logs for a selected environment.
     */
    private log(): void {
        this.context.subscriptions.push(vscode.commands.registerCommand('container-use.log', async () => {
            try {
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

                    // Get list of environments (this will validate cu binary internally)
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
                        placeHolder: 'Select an environment to view logs',
                        title: 'Container Use: View Environment Logs'
                    });

                    if (!selectedEnvironment) {
                        Logger.log('No environment selected. Log operation cancelled.');
                        return;
                    }

                    // Create terminal and run cu log command with selected environment
                    const terminal = vscode.window.createTerminal({
                        name: `Container Use Log - ${selectedEnvironment}`,
                        cwd: workspaceUri.fsPath
                    });
                    terminal.show();
                    terminal.sendText(`cu log ${selectedEnvironment}`, true);

                    Logger.log(`✅ Viewing logs for environment "${selectedEnvironment}"`);
                });

            } catch (error) {
                vscode.window.showErrorMessage(error instanceof Error ? error.message : 'An unexpected error occurred');
            }
        }));
    }

    /**
     * Handles the doctor command to run system health checks.
     */
    private doctor(): void {
        this.context.subscriptions.push(vscode.commands.registerCommand('container-use.doctor', async () => {
            try {
                let cuBinaryExists = false;

                await vscode.window.withProgress({
                    location: vscode.ProgressLocation.Notification,
                    title: 'Container Use: Running system checks...',
                    cancellable: false
                }, async (progress) => {
                    // Check 1: Docker is installed
                    progress.report({ message: 'Checking if Docker is installed...' });
                    const dockerInstalled = await exists('docker');
                    if (!dockerInstalled) {
                        throw new Error('Docker is not installed. Please install Docker first.');
                    }

                    // Check 2: Docker is running
                    progress.report({ message: 'Checking if Docker is running...' });
                    try {
                        const { spawn } = require('child_process');
                        const dockerProcess = spawn('docker', ['info'], { stdio: ['ignore', 'pipe', 'pipe'] });

                        await new Promise<void>((resolve, reject) => {
                            let completed = false;

                            // Set a timeout to avoid hanging
                            const timeout = setTimeout(() => {
                                if (!completed) {
                                    completed = true;
                                    dockerProcess.kill();
                                    reject(new Error('Docker info command timed out'));
                                }
                            }, 10000); // 10 second timeout

                            dockerProcess.on('close', (code: number) => {
                                if (completed) {
                                    return;
                                }
                                completed = true;
                                clearTimeout(timeout);

                                if (code === 0) {
                                    resolve();
                                } else {
                                    reject(new Error('Docker is not running'));
                                }
                            });

                            dockerProcess.on('error', (error: Error) => {
                                if (completed) {
                                    return;
                                }
                                completed = true;
                                clearTimeout(timeout);
                                reject(error);
                            });
                        });
                    } catch (error) {
                        throw new Error('Docker is not running. Please start Docker.');
                    }

                    // Check 3: Pull Dagger Engine image
                    progress.report({ message: 'Pulling Dagger Engine image...' });
                    try {
                        const { spawn } = require('child_process');
                        const pullProcess = spawn('docker', ['pull', 'registry.dagger.io/engine:v0.18.10'], {
                            stdio: ['ignore', 'pipe', 'pipe']
                        });

                        await new Promise<void>((resolve, reject) => {
                            let stderr = '';

                            pullProcess.stderr?.on('data', (data: Buffer) => {
                                stderr += data.toString();
                            });

                            pullProcess.on('close', (code: number) => {
                                if (code === 0) {
                                    resolve();
                                } else {
                                    reject(new Error(`Docker pull failed with code ${code}. ${stderr}`));
                                }
                            });

                            pullProcess.on('error', (error: Error) => {
                                reject(error);
                            });
                        });
                    } catch (error) {
                        throw error;
                    }

                    // Check 4: Container Use binary is installed
                    progress.report({ message: 'Checking if Container Use is installed...' });
                    // Create a temporary CLI instance to validate cu binary
                    const tempCli = new ContainerUseCli('.');
                    const validationResult = await tempCli.validate();
                    cuBinaryExists = validationResult === null;
                });

                // Check if cu binary exists and handle accordingly
                if (!cuBinaryExists) {
                    // Prompt user to install the cu binary
                    const installResponse = await vscode.window.showInformationMessage(
                        '⚠️ Container Use is not installed. Docker and Dagger Engine are ready, but you need to install Container Use to use this extension.',
                        'Install Now',
                        'Later'
                    );

                    if (installResponse === 'Install Now') {
                        // Run the install command
                        await vscode.commands.executeCommand('container-use.install');
                    } else {
                        Logger.log('🔧 Docker and Dagger Engine are ready. Install Container Use when you\'re ready to use the extension.');
                    }
                } else {
                    // Success notification - only shown if all checks pass including cu binary
                    Logger.log('🎉 Container Use: All checks passed! Your system is ready.');
                    vscode.window.showInformationMessage('🎉 Container Use: All checks passed, your system is ready!');
                }

            } catch (error) {
                // Error notification - shown if any check fails
                vscode.window.showErrorMessage(`❌ Container Use failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }));
    }

    /**
     * Handles the reset preferences command to clear saved user preferences.
     */
    private resetPreferences(): void {
        this.context.subscriptions.push(vscode.commands.registerCommand('container-use.resetPreferences', async () => {
            try {
                // Reset the install notice suppression preference
                await this.context.globalState.update('containerUse.suppressInstallNotice', undefined);
                
                // Reset the install method preference
                const config = vscode.workspace.getConfiguration('containerUse');
                await config.update('installMethod', '', vscode.ConfigurationTarget.Global);
                
                vscode.window.showInformationMessage('✅ Container Use preferences have been reset. Install notifications will be shown again and you will be prompted to choose an installation method.');
                Logger.log('Container Use preferences have been reset.');
            } catch (error) {
                vscode.window.showErrorMessage(error instanceof Error ? error.message : 'An unexpected error occurred while resetting preferences');
            }
        }));
    }
}

/**
 * Legacy functions for backward compatibility
 */
export function register(context: vscode.ExtensionContext) {
    const commands = new ContainerUseCommands(context);
    commands.register();
}

export function dispose() {
    Logger.dispose();
}