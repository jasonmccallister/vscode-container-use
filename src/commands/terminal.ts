import * as vscode from 'vscode';
import { createContainerUseCli, Environment } from '../cu/cli';
import type ContainerUseCli from '../cu/cli';
import { Item } from '../tree/provider';
import { executeInContainerUseTerminal } from '../utils/terminal';
import { showEnvironmentQuickPick, createCliInstance } from '../utils/environment';

const COMMANDS = {
    OPEN_ENVIRONMENT_TERMINAL: 'container-use.openEnvironmentTerminal'
} as const;

const MESSAGES = {
    SELECT_ENVIRONMENT: 'Select an environment to open terminal for:',
    NO_ENVIRONMENTS: 'No environments available.',
    FAILED_TO_LOAD_ENVIRONMENTS: 'Failed to load environments for terminal selection.'
} as const;

interface TerminalCommandConfig {
    workspacePath?: string;
    cli?: ContainerUseCli;
    extensionPath?: string;
}

/**
 * Opens a terminal for the specified environment using 'cu terminal <env>'
 * Reuses the same "Container Use" terminal, handling busy states appropriately
 */
const openTerminalForEnvironment = async (environmentId: string, extensionPath?: string): Promise<void> => {
    await executeInContainerUseTerminal(`cu terminal ${environmentId}`, extensionPath);
};

/**
 * Shows a quick pick dialog to select an environment and opens a terminal for it
 */
const showEnvironmentTerminalQuickPick = async (cli: ContainerUseCli, extensionPath?: string): Promise<void> => {
    const selectedEnvironment = await showEnvironmentQuickPick(cli, {
        placeHolder: MESSAGES.SELECT_ENVIRONMENT,
        noEnvironmentsMessage: MESSAGES.NO_ENVIRONMENTS,
        failedToLoadMessage: MESSAGES.FAILED_TO_LOAD_ENVIRONMENTS
    });
    
    if (selectedEnvironment) {
        await openTerminalForEnvironment(selectedEnvironment.id, extensionPath);
    }
};

/**
 * Handles the open environment terminal command
 * If called with a tree item context, opens terminal for that environment
 * Otherwise, shows a quick pick to select an environment
 */
const handleOpenEnvironmentTerminal = async (item?: Item, config: TerminalCommandConfig = {}): Promise<void> => {
    const {
        workspacePath,
        cli,
        extensionPath
    } = config;
    
    // If called from tree view context menu with an environment item
    if (item?.environmentId) {
        await openTerminalForEnvironment(item.environmentId, extensionPath);
        return;
    }
    
    // Otherwise, show quick pick to select environment
    const containerUseCli = cli || createCliInstance(workspacePath);
    await showEnvironmentTerminalQuickPick(containerUseCli, extensionPath);
};

/**
 * Registers the terminal command
 */
export const registerTerminalCommand = (context: vscode.ExtensionContext, config: TerminalCommandConfig = {}): void => {
    const terminalCommand = vscode.commands.registerCommand(
        COMMANDS.OPEN_ENVIRONMENT_TERMINAL,
        (item?: Item) => handleOpenEnvironmentTerminal(item, config)
    );
    
    context.subscriptions.push(terminalCommand);
};
