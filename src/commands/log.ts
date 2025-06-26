import * as vscode from 'vscode';
import { createContainerUseCli, Environment } from '../cu/cli';
import type ContainerUseCli from '../cu/cli';
import { Item } from '../tree/provider';
import { executeInContainerUseTerminal } from '../utils/terminal';

const COMMANDS = {
    ENVIRONMENT_LOGS: 'container-use.environmentLogs'
} as const;

const MESSAGES = {
    NO_ENVIRONMENTS: 'No environments available.',
    FAILED_TO_LOAD_ENVIRONMENTS: 'Failed to load environments for log selection.',
    SELECT_ENVIRONMENT_LOGS: 'Select an environment to view logs for:'
} as const;

interface LogCommandConfig {
    workspacePath?: string;
    cli?: ContainerUseCli;
    extensionPath?: string;
}

interface QuickPickEnvironmentItem extends vscode.QuickPickItem {
    environment: Environment;
}

/**
 * Opens logs for the specified environment using 'cu log <env>'
 * Reuses the same "Container Use" terminal, handling busy states appropriately
 */
const openLogsForEnvironment = async (environmentId: string, extensionPath?: string): Promise<void> => {
    await executeInContainerUseTerminal(`cu log ${environmentId}`, extensionPath);
};

/**
 * Shows a quick pick dialog to select an environment and opens logs for it
 */
const showEnvironmentLogsQuickPick = async (cli: ContainerUseCli, extensionPath?: string): Promise<void> => {
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
            placeHolder: MESSAGES.SELECT_ENVIRONMENT_LOGS,
            matchOnDescription: true,
            matchOnDetail: true
        });
        
        if (selected) {
            await openLogsForEnvironment(selected.environment.id, extensionPath);
        }
        
    } catch (error) {
        vscode.window.showErrorMessage(`${MESSAGES.FAILED_TO_LOAD_ENVIRONMENTS}: ${error}`);
    }
};

/**
 * Handles the environment logs command
 * If called with a tree item context, opens logs for that environment
 * Otherwise, shows a quick pick to select an environment
 */
const handleEnvironmentLogs = async (item?: Item, config: LogCommandConfig = {}): Promise<void> => {
    const {
        workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '',
        cli,
        extensionPath
    } = config;
    
    // If called from tree view context menu with an environment item
    if (item?.environmentId) {
        await openLogsForEnvironment(item.environmentId, extensionPath);
        return;
    }
    
    // Otherwise, show quick pick to select environment
    const containerUseCli = cli || createContainerUseCli({ workspacePath });
    await showEnvironmentLogsQuickPick(containerUseCli, extensionPath);
};

/**
 * Registers the logs command
 */
export const registerLogCommand = (context: vscode.ExtensionContext, config: LogCommandConfig = {}): void => {
    const logCommand = vscode.commands.registerCommand(
        COMMANDS.ENVIRONMENT_LOGS,
        (item?: Item) => handleEnvironmentLogs(item, config)
    );
    
    context.subscriptions.push(logCommand);
};
