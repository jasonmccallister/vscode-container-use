import * as vscode from 'vscode';
import { createContainerUseCli, Environment } from '../cu/cli';
import type ContainerUseCli from '../cu/cli';
import { Item } from '../tree/provider';

const COMMANDS = {
    CHECKOUT_ENVIRONMENT: 'container-use.checkoutEnvironment'
} as const;

const MESSAGES = {
    NO_ENVIRONMENTS: 'No environments available.',
    FAILED_TO_LOAD_ENVIRONMENTS: 'Failed to load environments for checkout selection.',
    SELECT_ENVIRONMENT_CHECKOUT: 'Select an environment to checkout:',
    CHECKOUT_SUCCESS: 'Successfully checked out environment',
    CHECKOUT_FAILED: 'Failed to checkout environment',
    CHECKOUT_IN_PROGRESS: 'Checking out environment...'
} as const;

interface CheckoutCommandConfig {
    workspacePath?: string;
    cli?: ContainerUseCli;
}

interface QuickPickEnvironmentItem extends vscode.QuickPickItem {
    environment: Environment;
}

/**
 * Checks out the specified environment using 'cu checkout <env>'
 * Runs the command behind the scenes and shows success/failure messages
 */
const checkoutEnvironment = async (environmentId: string, cli: ContainerUseCli): Promise<void> => {
    console.log(`[Container Use] Starting checkout for environment: ${environmentId}`);
    
    // Show progress message
    const progressMessage = `${MESSAGES.CHECKOUT_IN_PROGRESS}: ${environmentId}`;
    vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: progressMessage,
            cancellable: false
        },
        async (progress) => {
            try {
                // Run the checkout command
                const result = await cli.run(['checkout', environmentId]);
                
                if (result.success) {
                    const successMessage = `${MESSAGES.CHECKOUT_SUCCESS}: ${environmentId}`;
                    console.log(`[Container Use] ${successMessage}`);
                    vscode.window.showInformationMessage(successMessage);
                } else {
                    const errorMessage = `${MESSAGES.CHECKOUT_FAILED}: ${environmentId}`;
                    const errorDetails = result.stderr || result.stdout || 'Unknown error';
                    console.error(`[Container Use] ${errorMessage}`, errorDetails);
                    vscode.window.showErrorMessage(`${errorMessage}: ${errorDetails}`);
                }
            } catch (error) {
                const errorMessage = `${MESSAGES.CHECKOUT_FAILED}: ${environmentId}`;
                console.error(`[Container Use] ${errorMessage}`, error);
                vscode.window.showErrorMessage(`${errorMessage}: ${error}`);
            }
        }
    );
};

/**
 * Shows a quick pick dialog to select an environment and checks it out
 */
const showEnvironmentCheckoutQuickPick = async (cli: ContainerUseCli): Promise<void> => {
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
            placeHolder: MESSAGES.SELECT_ENVIRONMENT_CHECKOUT,
            matchOnDescription: true,
            matchOnDetail: true
        });
        
        if (selected) {
            await checkoutEnvironment(selected.environment.id, cli);
        }
        
    } catch (error) {
        vscode.window.showErrorMessage(`${MESSAGES.FAILED_TO_LOAD_ENVIRONMENTS}: ${error}`);
    }
};

/**
 * Handles the checkout environment command
 * If called with a tree item context, checks out that environment
 * Otherwise, shows a quick pick to select an environment
 */
const handleCheckoutEnvironment = async (item?: Item, config: CheckoutCommandConfig = {}): Promise<void> => {
    const {
        workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '',
        cli
    } = config;
    
    const containerUseCli = cli || createContainerUseCli({ workspacePath });
    
    // If called from tree view context menu with an environment item
    if (item?.environmentId) {
        await checkoutEnvironment(item.environmentId, containerUseCli);
        return;
    }
    
    // Otherwise, show quick pick to select environment
    await showEnvironmentCheckoutQuickPick(containerUseCli);
};

/**
 * Registers the checkout environment command
 */
export const registerCheckoutCommand = (context: vscode.ExtensionContext, config: CheckoutCommandConfig = {}): void => {
    const checkoutCommand = vscode.commands.registerCommand(
        COMMANDS.CHECKOUT_ENVIRONMENT,
        (item?: Item) => handleCheckoutEnvironment(item, config)
    );
    
    context.subscriptions.push(checkoutCommand);
};
