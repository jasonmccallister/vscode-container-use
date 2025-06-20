import * as vscode from 'vscode';
import * as commands from './commands/commands';
import * as mcp from './mcpserver/mcpserver';
import ContainerUseCli from './cli';
import { exists } from './utils/executable';

const extensionVersion = '0.1.0';
const homebrewOption = 'Use Homebrew (recommended)';
const curlOption = 'Use curl script';
const brewInstallCommand = 'brew install dagger/tap/container-use';
const curlInstallCommand = 'TODO';

// make a custom type for install method
type InstallMethod = 'brew' | 'curl' | '';


async function isInstalled(ws?: vscode.Uri): Promise<boolean> {
    const cli = new ContainerUseCli('cu', ws);
    return await cli.isInstalled();
}

export function activate(context: vscode.ExtensionContext) {
    if (!isInstalled(context.extensionUri)) {
        vscode.window.showWarningMessage(
            'Container Use is not installed. Commands will not work until it is installed.',
            'Install Now'
        ).then((response) => {
            if (response === 'Install Now') {
                vscode.commands.executeCommand('container-use.install');
            }
        });
    }

    vscode.commands.registerCommand('container-use.install', async () => {
        if (!isInstalled) {
            // Get current install method preference from settings
            const config = vscode.workspace.getConfiguration('container-use');
            let defaultInstallMethod: InstallMethod = config.get('installMethod', '');

            // Check if user is on macOS and has brew installed first
            let installMethod: InstallMethod = defaultInstallMethod;
            let installPromptMessage = 'Container Use is not installed. Would you like to install it now?';
            let installOptions = ['Install', 'Cancel'];

            // brew is available on macOS and Linux
            if (process.platform === 'darwin' || process.platform === 'linux') {
                if (await exists('brew')) {
                    // If no preference is set (empty string), show both options
                    if (defaultInstallMethod === '') {
                        installOptions = [homebrewOption, curlOption];
                    } else {
                        // Use the preferred method from settings as default, but still show options
                        const preferredOption = defaultInstallMethod === 'brew' ? homebrewOption : curlOption;
                        const alternateOption = defaultInstallMethod === 'brew' ? curlOption : homebrewOption;
                        installOptions = [preferredOption, alternateOption];
                    }
                } else {
                    // Brew not available, only show curl option if no preference or preference is curl
                    if (defaultInstallMethod === '' || defaultInstallMethod === 'curl') {
                        installOptions = ['Install (curl)', 'Cancel'];
                    }
                }
            } else {
                // Not macOS/Linux, only curl is available
                installOptions = ['Install (curl)', 'Cancel'];
            }

            const installResponse = await vscode.window.showInformationMessage(
                installPromptMessage,
                { modal: true },
                ...installOptions
            );

            if (installResponse === 'Cancel' || !installResponse) {
                vscode.window.showInformationMessage('Installation cancelled. You can install Container Use later by running the "Container Use: Install" command.');
                return;
            }

            // Determine install method based on response
            if (installResponse === homebrewOption) {
                installMethod = 'brew';
            } else if (installResponse === curlOption) {
                installMethod = 'curl';
            } else if (installResponse === 'Install (curl)') {
                installMethod = 'curl';
            } else if (installResponse === 'Install') {
                // If defaultInstallMethod is empty, default to curl as fallback
                installMethod = defaultInstallMethod === '' ? 'curl' : defaultInstallMethod;
            }

            // Update the setting with the user's choice (only if they made a specific choice and no preference was set)
            if (defaultInstallMethod === '' && (installResponse === homebrewOption || installResponse === curlOption)) {
                await config.update('installMethod', installMethod, vscode.ConfigurationTarget.Global);
            }

            // Execute the installation command
            const terminal = vscode.window.createTerminal('Container Use');
            terminal.show();

            let installCommand: string;
            if (installMethod === 'brew') {
                installCommand = brewInstallCommand;

            } else {
                installCommand = curlInstallCommand;

            }

            terminal.sendText(installCommand);

            // Show option to verify installation after a delay
            setTimeout(async () => {
                const verifyResponse = await vscode.window.showInformationMessage(
                    'Installation command has been executed. Would you like to verify the installation?',
                    'Verify',
                    'Later'
                );

                if (verifyResponse === 'Verify') {
                    if (await exists('container-use')) {
                        vscode.window.showInformationMessage('✅ Container Use has been successfully installed!');
                    } else {
                        vscode.window.showWarningMessage('⚠️ Container Use was not found. Please check the terminal output for any errors and ensure your PATH is updated.');
                    }
                }
            }, 8000); // Wait 8 seconds for brew (slower than curl)

            return;
        }

        vscode.window.showInformationMessage('Container Use is already installed.');
    }),

        // add MCP server definition provider
        mcp.add(context, extensionVersion);
}

export function deactivate() {
    // Clean up any resources when extension is deactivated
    commands.dispose();
}
