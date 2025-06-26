import * as vscode from 'vscode';
import { createContainerUseCli, Environment } from '../cu/cli';
import type ContainerUseCli from '../cu/cli';
import { Item } from '../tree/provider';
import { showEnvironmentQuickPick, createCliInstance } from '../utils/environment';

const COMMANDS = {
    CHECKOUT_ENVIRONMENT: 'container-use.checkoutEnvironment'
} as const;

const MESSAGES = {
    SELECT_ENVIRONMENT_CHECKOUT: 'Select an environment to checkout:',
    CHECKOUT_SUCCESS: 'Successfully checked out environment',
    CHECKOUT_FAILED: 'Failed to checkout environment',
    CHECKOUT_IN_PROGRESS: 'Checking out environment...',
    NO_ENVIRONMENTS: 'No environments available.',
    FAILED_TO_LOAD_ENVIRONMENTS: 'Failed to load environments for checkout selection.'
} as const;

interface CheckoutCommandConfig {
    workspacePath?: string;
    cli?: ContainerUseCli;
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
    const selectedEnvironment = await showEnvironmentQuickPick(cli, {
        placeHolder: MESSAGES.SELECT_ENVIRONMENT_CHECKOUT,
        noEnvironmentsMessage: MESSAGES.NO_ENVIRONMENTS,
        failedToLoadMessage: MESSAGES.FAILED_TO_LOAD_ENVIRONMENTS
    });
    
    if (selectedEnvironment) {
        await checkoutEnvironment(selectedEnvironment.id, cli);
    }
};

/**
 * Handles the checkout environment command
 * If called with a tree item context, checks out that environment
 * Otherwise, shows a quick pick to select an environment
 */
const handleCheckoutEnvironment = async (item?: Item, config: CheckoutCommandConfig = {}): Promise<void> => {
    const {
        workspacePath,
        cli
    } = config;
    
    const containerUseCli = cli || createCliInstance(workspacePath);
    
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
