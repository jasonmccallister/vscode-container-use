import * as vscode from 'vscode';
import type ContainerUseCli from '../cli/cli';
import { Item } from '../tree/provider';
import { showEnvironmentQuickPick, createCliInstance } from '../utils/environment';

const COMMANDS = {
    DELETE_ENVIRONMENT: 'container-use.deleteEnvironment'
} as const;

const MESSAGES = {
    SELECT_ENVIRONMENT_DELETE: 'Select an environment to delete:',
    DELETE_SUCCESS: 'Successfully deleted environment',
    DELETE_FAILED: 'Failed to delete environment',
    DELETE_IN_PROGRESS: 'Deleting environment...',
    NO_ENVIRONMENTS: 'No environments available.',
    FAILED_TO_LOAD_ENVIRONMENTS: 'Failed to load environments for delete selection.'
} as const;

interface DeleteCommandConfig {
    workspacePath?: string;
    cli?: ContainerUseCli;
}

/**
 * Deletes the specified environment using 'cu delete <env>'
 * Runs the command behind the scenes and shows success/failure messages
 */
const deleteEnvironment = async (environmentId: string, cli: ContainerUseCli): Promise<void> => {
    console.log(`[Container Use] Starting delete for environment: ${environmentId}`);
    
    // Show progress message
    const progressMessage = `${MESSAGES.DELETE_IN_PROGRESS}: ${environmentId}`;
    vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: progressMessage,
            cancellable: false
        },
        async (progress) => {
            try {
                // Run the delete command
                const result = await cli.run(['delete', environmentId]);
                
                if (result.success) {
                    const successMessage = `${MESSAGES.DELETE_SUCCESS}: ${environmentId}`;
                    console.log(`[Container Use] ${successMessage}`);
                    vscode.window.showInformationMessage(successMessage);
                } else {
                    const errorMessage = `${MESSAGES.DELETE_FAILED}: ${environmentId}`;
                    const errorDetails = result.stderr || result.stdout || 'Unknown error';
                    console.error(`[Container Use] ${errorMessage}`, errorDetails);
                    vscode.window.showErrorMessage(`${errorMessage}: ${errorDetails}`);
                }
            } catch (error) {
                const errorMessage = `${MESSAGES.DELETE_FAILED}: ${environmentId}`;
                console.error(`[Container Use] ${errorMessage}`, error);
                vscode.window.showErrorMessage(`${errorMessage}: ${error}`);
            }
        }
    );
};

/**
 * Shows a quick pick dialog to select an environment and deletes it
 */
const showEnvironmentDeleteQuickPick = async (cli: ContainerUseCli): Promise<void> => {
    const selectedEnvironment = await showEnvironmentQuickPick(cli, {
        placeHolder: MESSAGES.SELECT_ENVIRONMENT_DELETE,
        noEnvironmentsMessage: MESSAGES.NO_ENVIRONMENTS,
        failedToLoadMessage: MESSAGES.FAILED_TO_LOAD_ENVIRONMENTS
    });
    
    if (selectedEnvironment) {
        await deleteEnvironment(selectedEnvironment.id, cli);
    }
};

/**
 * Handles the delete environment command
 * If called with a tree item context, deletes that environment
 * Otherwise, shows a quick pick to select an environment
 */
const handleDeleteEnvironment = async (item?: Item, config: DeleteCommandConfig = {}): Promise<void> => {
    const {
        workspacePath,
        cli
    } = config;
    
    const containerUseCli = cli || createCliInstance(workspacePath);
    
    // If called from tree view context menu with an environment item
    if (item?.environmentId) {
        await deleteEnvironment(item.environmentId, containerUseCli);
        return;
    }
    
    // Otherwise, show quick pick to select environment
    await showEnvironmentDeleteQuickPick(containerUseCli);
};

/**
 * Registers the delete environment command
 */
export const registerDeleteCommand = (context: vscode.ExtensionContext, config: DeleteCommandConfig = {}): void => {
    const deleteCommand = vscode.commands.registerCommand(
        COMMANDS.DELETE_ENVIRONMENT,
        (item?: Item) => handleDeleteEnvironment(item, config)
    );
    
    context.subscriptions.push(deleteCommand);
};
