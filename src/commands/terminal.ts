import * as vscode from 'vscode';
import { createContainerUseCli, Environment } from '../cu/cli';
import type ContainerUseCli from '../cu/cli';
import { Item } from '../tree/provider';

const COMMANDS = {
    OPEN_ENVIRONMENT_TERMINAL: 'container-use.openEnvironmentTerminal'
} as const;

const MESSAGES = {
    NO_ENVIRONMENTS: 'No environments available.',
    FAILED_TO_LOAD_ENVIRONMENTS: 'Failed to load environments for terminal selection.',
    SELECT_ENVIRONMENT: 'Select an environment to open terminal for:',
    TERMINAL_BUSY: 'The Container Use terminal appears to be busy. Do you want to interrupt the current process?',
    INTERRUPT_PROCESS: 'Interrupt Process',
    CANCEL: 'Cancel'
} as const;

const TERMINAL_CONFIG = {
    NAME: 'Container Use',
    SHELL_INTEGRATION_TIMEOUT: 2000, // 2 seconds to check if terminal is busy
    CTRL_C: '\x03', // Control+C character
    CLEAR_SCREEN: '\x0c', // Form feed to clear screen
    CLEAR_LINE: '\x15', // NAK to clear current line
    EXIT_COMMAND: 'exit'
} as const;

interface TerminalCommandConfig {
    workspacePath?: string;
    cli?: ContainerUseCli;
}

interface QuickPickEnvironmentItem extends vscode.QuickPickItem {
    environment: Environment;
}

/**
 * Finds an existing Container Use terminal or creates a new one
 * Returns both the terminal and whether it was newly created
 */
const findOrCreateContainerUseTerminal = (): { terminal: vscode.Terminal; isNewlyCreated: boolean } => {
    // Look for existing Container Use terminal
    const existingTerminal = vscode.window.terminals.find(
        terminal => terminal.name === TERMINAL_CONFIG.NAME
    );
    
    if (existingTerminal) {
        return { terminal: existingTerminal, isNewlyCreated: false };
    }
    
    // Create new terminal if none exists
    const newTerminal = vscode.window.createTerminal({
        name: TERMINAL_CONFIG.NAME,
        shellPath: undefined, // Use default shell
        shellArgs: undefined
    });
    
    return { terminal: newTerminal, isNewlyCreated: true };
};

/**
 * Checks if a terminal appears to be busy by examining its shell integration state
 */
const isTerminalBusy = (terminal: vscode.Terminal): boolean => {
    // VS Code's shell integration provides state information
    const shellIntegration = terminal.shellIntegration;
    
    if (shellIntegration) {
        // Check if there's an active command execution
        // The cwd property changes when a command is running vs when it's at prompt
        // Also check if there are any active executions
        const hasActiveExecution = shellIntegration.executeCommand !== undefined;
        
        // Additional check: see if we can access the current working directory
        // This is a more reliable indicator than executeCommand
        try {
            // If we can get the CWD and there's no active execution, terminal is likely ready
            return hasActiveExecution && shellIntegration.cwd !== undefined;
        } catch {
            // If we can't determine state, assume it's not busy for new terminals
            return false;
        }
    }
    
    // If no shell integration, we can't reliably detect busy state
    // For new terminals or terminals without integration, assume they're ready
    return false;
};

/**
 * Handles interrupting a busy terminal process
 */
const handleBusyTerminal = async (terminal: vscode.Terminal): Promise<boolean> => {
    const action = await vscode.window.showWarningMessage(
        MESSAGES.TERMINAL_BUSY,
        { modal: true },
        MESSAGES.INTERRUPT_PROCESS,
        MESSAGES.CANCEL
    );
    
    if (action === MESSAGES.INTERRUPT_PROCESS) {
        // Clear any running processes and reset terminal to clean state
        
        // 1. Send Ctrl+C multiple times to ensure any process is interrupted
        terminal.sendText(TERMINAL_CONFIG.CTRL_C, false);
        await new Promise(resolve => setTimeout(resolve, 100));
        terminal.sendText(TERMINAL_CONFIG.CTRL_C, false);
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // 2. Clear the current line input
        terminal.sendText(TERMINAL_CONFIG.CLEAR_LINE, false);
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // 3. Send exit command to get back to shell if in a sub-process
        terminal.sendText(TERMINAL_CONFIG.EXIT_COMMAND);
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // 4. Clear the screen for a clean start
        terminal.sendText('clear');
        await new Promise(resolve => setTimeout(resolve, 200));
        
        return true;
    }
    
    return false; // User cancelled
};

/**
 * Opens a terminal for the specified environment using 'cu terminal <env>'
 * Reuses the same "Container Use" terminal, handling busy states appropriately
 */
const openTerminalForEnvironment = async (environmentId: string): Promise<void> => {
    const { terminal, isNewlyCreated } = findOrCreateContainerUseTerminal();
    
    // Check if terminal is busy (only for existing terminals, not newly created ones)
    if (!isNewlyCreated && isTerminalBusy(terminal)) {
        const shouldProceed = await handleBusyTerminal(terminal);
        if (!shouldProceed) {
            return; // User cancelled
        }
    }
    
    // Send the command to the terminal
    terminal.sendText(`cu terminal ${environmentId}`);
    
    // Show the terminal
    terminal.show();
};

/**
 * Shows a quick pick dialog to select an environment and opens a terminal for it
 */
const showEnvironmentQuickPick = async (cli: ContainerUseCli): Promise<void> => {
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
            placeHolder: MESSAGES.SELECT_ENVIRONMENT,
            matchOnDescription: true,
            matchOnDetail: true
        });
        
        if (selected) {
            await openTerminalForEnvironment(selected.environment.id);
        }
        
    } catch (error) {
        vscode.window.showErrorMessage(`${MESSAGES.FAILED_TO_LOAD_ENVIRONMENTS}: ${error}`);
    }
};

/**
 * Handles the open environment terminal command
 * If called with a tree item context, opens terminal for that environment
 * Otherwise, shows a quick pick to select an environment
 */
const handleOpenEnvironmentTerminal = async (item?: Item, config: TerminalCommandConfig = {}): Promise<void> => {
    const {
        workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '',
        cli
    } = config;
    
    // If called from tree view context menu with an environment item
    if (item?.environmentId) {
        await openTerminalForEnvironment(item.environmentId);
        return;
    }
    
    // Otherwise, show quick pick to select environment
    const containerUseCli = cli || createContainerUseCli({ workspacePath });
    await showEnvironmentQuickPick(containerUseCli);
};

/**
 * Registers the open environment terminal command
 */
export const registerTerminalCommand = (context: vscode.ExtensionContext, config: TerminalCommandConfig = {}): void => {
    const command = vscode.commands.registerCommand(
        COMMANDS.OPEN_ENVIRONMENT_TERMINAL,
        (item?: Item) => handleOpenEnvironmentTerminal(item, config)
    );
    
    context.subscriptions.push(command);
};
