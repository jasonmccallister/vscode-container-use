import * as vscode from 'vscode';

/**
 * Checks if a binary exists in the system by attempting to run it
 * @param binaryName The name of the binary to check
 * @returns A promise that resolves to true if the binary exists, false otherwise
 */
export function ensureBinaryExists(binaryName: string): boolean {
    try {
        const result = vscode.commands.executeCommand('workbench.action.terminal.sendSequence', {
            text: `${binaryName} version\n`
        });
        return result !== undefined;
    } catch (error) {
        console.error(`Error checking for binary ${binaryName}:`, error);
        return false;
    }
}