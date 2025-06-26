import * as vscode from 'vscode';
import { createContainerUseCli, Environment } from '../cli/cli';
import type ContainerUseCli from '../cli/cli';

interface QuickPickEnvironmentItem extends vscode.QuickPickItem {
    environment: Environment;
}

interface EnvironmentQuickPickOptions {
    placeHolder: string;
    noEnvironmentsMessage?: string;
    failedToLoadMessage?: string;
}

const DEFAULT_MESSAGES = {
    NO_ENVIRONMENTS: 'No environments available.',
    FAILED_TO_LOAD_ENVIRONMENTS: 'Failed to load environments.'
} as const;

/**
 * Shows a quick pick dialog to select an environment
 * Returns the selected environment or undefined if cancelled
 */
export const showEnvironmentQuickPick = async (
    cli: ContainerUseCli, 
    options: EnvironmentQuickPickOptions
): Promise<Environment | undefined> => {
    const {
        placeHolder,
        noEnvironmentsMessage = DEFAULT_MESSAGES.NO_ENVIRONMENTS,
        failedToLoadMessage = DEFAULT_MESSAGES.FAILED_TO_LOAD_ENVIRONMENTS
    } = options;

    try {
        // Load environments
        const environments = await cli.environments();
        
        if (environments.length === 0) {
            vscode.window.showInformationMessage(noEnvironmentsMessage);
            return undefined;
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
            placeHolder,
            matchOnDescription: true,
            matchOnDetail: true
        });
        
        return selected?.environment;
        
    } catch (error) {
        vscode.window.showErrorMessage(`${failedToLoadMessage}: ${error}`);
        return undefined;
    }
};

/**
 * Creates a ContainerUseCli instance with the given workspace path
 */
export const createCliInstance = (workspacePath?: string): ContainerUseCli => {
    const path = workspacePath || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
    return createContainerUseCli({ workspacePath: path });
};
