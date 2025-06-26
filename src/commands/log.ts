import * as vscode from 'vscode';
import type ContainerUseCli from '../cli/cli';
import { Item } from '../tree/provider';
import { executeCommandInTerminal } from '../utils/terminal';
import { showEnvironmentQuickPick, createCliInstance } from '../utils/environment';

const COMMANDS = {
    ENVIRONMENT_LOGS: 'container-use.environmentLogs'
} as const;

const MESSAGES = {
    SELECT_ENVIRONMENT_LOGS: 'Select an environment to view logs for:',
    NO_ENVIRONMENTS: 'No environments available.',
    FAILED_TO_LOAD_ENVIRONMENTS: 'Failed to load environments for log selection.'
} as const;

interface LogCommandConfig {
    workspacePath?: string;
    cli?: ContainerUseCli;
    extensionPath?: string;
}

/**
 * Opens logs for the specified environment using 'cu log <env>'
 * Reuses the same "Container Use" terminal, handling busy states appropriately
 */
const openLogsForEnvironment = async (environmentId: string, extensionPath?: string): Promise<void> => {
    await executeCommandInTerminal(`cu log ${environmentId}`, extensionPath);
};

/**
 * Shows a quick pick dialog to select an environment and opens logs for it
 */
const showEnvironmentLogsQuickPick = async (cli: ContainerUseCli, extensionPath?: string): Promise<void> => {
    const selectedEnvironment = await showEnvironmentQuickPick(cli, {
        placeHolder: MESSAGES.SELECT_ENVIRONMENT_LOGS,
        noEnvironmentsMessage: MESSAGES.NO_ENVIRONMENTS,
        failedToLoadMessage: MESSAGES.FAILED_TO_LOAD_ENVIRONMENTS
    });
    
    if (selectedEnvironment) {
        await openLogsForEnvironment(selectedEnvironment.id, extensionPath);
    }
};

/**
 * Handles the environment logs command
 * If called with a tree item context, opens logs for that environment
 * Otherwise, shows a quick pick to select an environment
 */
const handleEnvironmentLogs = async (item?: Item, config: LogCommandConfig = {}): Promise<void> => {
    const {
        workspacePath,
        cli,
        extensionPath
    } = config;
    
    // If called from tree view context menu with an environment item
    if (item?.environmentId) {
        await openLogsForEnvironment(item.environmentId, extensionPath);
        return;
    }
    
    // Otherwise, show quick pick to select environment
    const containerUseCli = cli || createCliInstance(workspacePath);
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
