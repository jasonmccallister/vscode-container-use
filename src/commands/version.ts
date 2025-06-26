import * as vscode from 'vscode';
import { createCliInstance } from '../utils/environment';
import type ContainerUseCli from '../cli/cli';

const COMMANDS = {
    VERSION: 'container-use.version'
} as const;

const MESSAGES = {
    VERSION_TITLE: 'Container Use',
    VERSION_FAILED: 'Failed to get Container Use version',
    VERSION_IN_PROGRESS: 'Getting Container Use version...'
} as const;

interface VersionCommandConfig {
    workspacePath?: string;
    cli?: ContainerUseCli;
}

/**
 * Gets and displays the Container Use version using 'cu version'
 * Shows the result in an information message dialog
 */
const getAndShowVersion = async (cli: ContainerUseCli): Promise<void> => {
    console.log('[Container Use] Getting version information');
    
    await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: MESSAGES.VERSION_IN_PROGRESS,
            cancellable: false
        },
        async (progress) => {
            try {
                // Run the version command
                const result = await cli.run(['version']);
                
                if (result.success) {
                    const versionOutput = result.stdout?.trim() || 'Version information not available';
                    console.log(`[Container Use] Version: ${versionOutput}`);
                    
                    // Show version in information dialog
                    vscode.window.showInformationMessage(
                        `${MESSAGES.VERSION_TITLE}: ${versionOutput}`,
                        { modal: false }
                    );
                } else {
                    const errorMessage = result.stderr || result.stdout || 'Unknown error';
                    console.error(`[Container Use] ${MESSAGES.VERSION_FAILED}`, errorMessage);
                    vscode.window.showErrorMessage(`${MESSAGES.VERSION_FAILED}: ${errorMessage}`);
                }
            } catch (error) {
                console.error(`[Container Use] ${MESSAGES.VERSION_FAILED}`, error);
                vscode.window.showErrorMessage(`${MESSAGES.VERSION_FAILED}: ${error}`);
            }
        }
    );
};

/**
 * Handles the version command
 * Gets and displays the Container Use version
 */
const handleVersionCommand = async (config: VersionCommandConfig = {}): Promise<void> => {
    const { workspacePath, cli } = config;
    
    const containerUseCli = cli || createCliInstance(workspacePath);
    await getAndShowVersion(containerUseCli);
};

/**
 * Registers the version command
 */
export const registerVersionCommand = (context: vscode.ExtensionContext, config: VersionCommandConfig = {}): void => {
    const versionCommand = vscode.commands.registerCommand(
        COMMANDS.VERSION,
        () => handleVersionCommand(config)
    );
    
    context.subscriptions.push(versionCommand);
};
