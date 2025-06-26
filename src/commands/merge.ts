import * as vscode from 'vscode';
import { createContainerUseCli, Environment } from '../cu/cli';
import type ContainerUseCli from '../cu/cli';
import { Item } from '../tree/provider';

const COMMANDS = {
    MERGE_ENVIRONMENT: 'container-use.mergeEnvironment'
} as const;

const MESSAGES = {
    NO_ENVIRONMENTS: 'No environments available.',
    FAILED_TO_LOAD_ENVIRONMENTS: 'Failed to load environments for merge selection.',
    SELECT_ENVIRONMENT_MERGE: 'Select an environment to merge:',
    MERGE_SUCCESS: 'Successfully merged environment',
    MERGE_FAILED: 'Failed to merge environment',
    MERGE_IN_PROGRESS: 'Merging environment...',
    DELETE_PROMPT: 'Environment merged successfully. Do you want to delete the environment?',
    DELETE_ENVIRONMENT_ACTION: 'Delete Environment',
    KEEP_ENVIRONMENT_ACTION: 'Keep Environment'
} as const;

interface MergeCommandConfig {
    workspacePath?: string;
    cli?: ContainerUseCli;
}

interface QuickPickEnvironmentItem extends vscode.QuickPickItem {
    environment: Environment;
}

/**
 * Prompts user to delete environment after successful merge
 */
const promptForEnvironmentDeletion = async (environmentId: string): Promise<void> => {
    const action = await vscode.window.showInformationMessage(
        MESSAGES.DELETE_PROMPT,
        { modal: false },
        MESSAGES.DELETE_ENVIRONMENT_ACTION,
        MESSAGES.KEEP_ENVIRONMENT_ACTION
    );
    
    if (action === MESSAGES.DELETE_ENVIRONMENT_ACTION) {
        // Create a mock Item with the environment ID to pass to the delete command
        const environmentItem: Item = {
            label: environmentId,
            environmentId: environmentId
        } as Item;
        
        // Execute the delete command with the environment item
        await vscode.commands.executeCommand('container-use.deleteEnvironment', environmentItem);
    }
};

/**
 * Merges the specified environment using 'cu merge <env>'
 * Runs the command behind the scenes and shows success/failure messages
 * On success, optionally prompts to delete the environment
 */
const mergeEnvironment = async (environmentId: string, cli: ContainerUseCli): Promise<void> => {
    console.log(`[Container Use] Starting merge for environment: ${environmentId}`);
    
    // Show progress message
    const progressMessage = `${MESSAGES.MERGE_IN_PROGRESS}: ${environmentId}`;
    vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: progressMessage,
            cancellable: false
        },
        async (progress) => {
            try {
                // Run the merge command
                const result = await cli.run(['merge', environmentId]);
                
                if (result.success) {
                    const successMessage = `${MESSAGES.MERGE_SUCCESS}: ${environmentId}`;
                    console.log(`[Container Use] ${successMessage}`);
                    vscode.window.showInformationMessage(successMessage);
                    
                    // Prompt for deletion after successful merge
                    await promptForEnvironmentDeletion(environmentId);
                } else {
                    const errorMessage = `${MESSAGES.MERGE_FAILED}: ${environmentId}`;
                    const errorDetails = result.stderr || result.stdout || 'Unknown error';
                    console.error(`[Container Use] ${errorMessage}`, errorDetails);
                    vscode.window.showErrorMessage(`${errorMessage}: ${errorDetails}`);
                }
            } catch (error) {
                const errorMessage = `${MESSAGES.MERGE_FAILED}: ${environmentId}`;
                console.error(`[Container Use] ${errorMessage}`, error);
                vscode.window.showErrorMessage(`${errorMessage}: ${error}`);
            }
        }
    );
};

/**
 * Shows a quick pick dialog to select an environment and merges it
 */
const showEnvironmentMergeQuickPick = async (cli: ContainerUseCli): Promise<void> => {
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
            placeHolder: MESSAGES.SELECT_ENVIRONMENT_MERGE,
            matchOnDescription: true,
            matchOnDetail: true
        });
        
        if (selected) {
            await mergeEnvironment(selected.environment.id, cli);
        }
        
    } catch (error) {
        vscode.window.showErrorMessage(`${MESSAGES.FAILED_TO_LOAD_ENVIRONMENTS}: ${error}`);
    }
};

/**
 * Handles the merge environment command
 * If called with a tree item context, merges that environment
 * Otherwise, shows a quick pick to select an environment
 */
const handleMergeEnvironment = async (item?: Item, config: MergeCommandConfig = {}): Promise<void> => {
    const {
        workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '',
        cli
    } = config;
    
    const containerUseCli = cli || createContainerUseCli({ workspacePath });
    
    // If called from tree view context menu with an environment item
    if (item?.environmentId) {
        await mergeEnvironment(item.environmentId, containerUseCli);
        return;
    }
    
    // Otherwise, show quick pick to select environment
    await showEnvironmentMergeQuickPick(containerUseCli);
};

/**
 * Registers the merge environment command
 */
export const registerMergeCommand = (context: vscode.ExtensionContext, config: MergeCommandConfig = {}): void => {
    const mergeCommand = vscode.commands.registerCommand(
        COMMANDS.MERGE_ENVIRONMENT,
        (item?: Item) => handleMergeEnvironment(item, config)
    );
    
    context.subscriptions.push(mergeCommand);
};
