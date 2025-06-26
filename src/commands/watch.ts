import * as vscode from 'vscode';
import { executeInContainerUseTerminal } from '../utils/terminal';

const COMMANDS = {
    WATCH: 'container-use.watch'
} as const;

interface WatchCommandConfig {
    extensionPath?: string;
}

/**
 * Opens a terminal and runs 'cu watch' command
 * Reuses the same "Container Use" terminal, handling busy states appropriately
 */
const runWatchCommand = async (extensionPath?: string): Promise<void> => {
    await executeInContainerUseTerminal('cu watch', extensionPath);
};

/**
 * Handles the watch command
 * Opens a terminal and runs 'cu watch'
 */
const handleWatchCommand = async (config: WatchCommandConfig = {}): Promise<void> => {
    const { extensionPath } = config;
    await runWatchCommand(extensionPath);
};

/**
 * Registers the watch command
 */
export const registerWatchCommand = (context: vscode.ExtensionContext, config: WatchCommandConfig = {}): void => {
    const watchCommand = vscode.commands.registerCommand(
        COMMANDS.WATCH,
        () => handleWatchCommand(config)
    );
    
    context.subscriptions.push(watchCommand);
};
