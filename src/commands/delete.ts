import * as vscode from 'vscode';
import { createContainerUseCli, Environment } from '../cu/cli';
import type ContainerUseCli from '../cu/cli';
import { Item } from '../tree/provider';

const COMMANDS = {
    DELETE_ENVIRONMENT: 'container-use.deleteEnvironment'
} as const;

const MESSAGES = {
    NO_ENVIRONMENTS: 'No environments available.',
    FAILED_TO_LOAD_ENVIRONMENTS: 'Failed to load environments for delete selection.',
    SELECT_ENVIRONMENT_DELETE: 'Select an environment to delete:',
    DELETE_SUCCESS: 'Successfully deleted environment',
    DELETE_FAILED: 'Failed to delete environment',
    DELETE_IN_PROGRESS: 'Deleting environment...'
} as const;

interface DeleteCommandConfig {
    workspacePath?: string;
    cli?: ContainerUseCli;
}

interface QuickPickEnvironmentItem extends vscode.QuickPickItem {
    environment: Environment;
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
    try {
        // Load environments
        const environments = await cli.environments();
        
        if (environments.length === 0) {
            vscode.window.showInformationMessage(MESSAGES.NO_ENVIRONMENTS);
            return;
        }
        
        // Create quick pick items
        const quickPickItems: QuickPickEnvironmentItem[] = environments.map(env => ({
            label: env.id,
            description: env.title,
            detail: env.created ? `Created: ${env.created}` : undefined,
            environment: env
        }));
        
        // Show quick pick
        const selected = await vscode.window.showQuickPick(quickPickItems, {
            placeHolder: MESSAGES.SELECT_ENVIRONMENT_DELETE,
            matchOnDescription: true,
            matchOnDetail: true
        });
        
        if (selected) {
            await deleteEnvironment(selected.environment.id, cli);
        }
        
    } catch (error) {
        vscode.window.showErrorMessage(`${MESSAGES.FAILED_TO_LOAD_ENVIRONMENTS}: ${error}`);
    }
};

/**
 * Handles the delete environment command
 * If called with a tree item context, deletes that environment
 * Otherwise, shows a quick pick to select an environment
 */
const handleDeleteEnvironment = async (item?: Item, config: DeleteCommandConfig = {}): Promise<void> => {
    const {
        workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '',
        cli
    } = config;
    
    const containerUseCli = cli || createContainerUseCli({ workspacePath });
    
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
