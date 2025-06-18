import * as vscode from 'vscode';

/**
 * Utility functions for file and directory operations in VS Code workspace
 */

/**
 * Ensures a directory exists by creating it if it doesn't exist
 * @param dirPath The URI path to the directory
 */
export async function ensureDirectoryExists(dirPath: vscode.Uri): Promise<void> {
    try {
        await vscode.workspace.fs.createDirectory(dirPath);
    } catch (error) {
        // Directory might already exist, which is fine
        console.log(`Directory creation note: ${error}`);
    }
}

/**
 * Writes content to a file, creating the directory structure if needed
 * @param filePath The URI path to the file
 * @param content The content to write to the file
 */
export async function writeFileWithDirectories(filePath: vscode.Uri, content: string): Promise<void> {
    // Ensure the parent directory exists
    const parentDir = vscode.Uri.joinPath(filePath, '..');
    await ensureDirectoryExists(parentDir);
    
    // Write the file
    await vscode.workspace.fs.writeFile(filePath, Buffer.from(content));
}

/**
 * Creates the Copilot instructions file in the workspace
 * @param workspaceUri The workspace root URI
 * @param instructionsContent The content for the instructions file
 */
export async function createCopilotInstructionsFile(workspaceUri: vscode.Uri, instructionsContent: string): Promise<void> {
    const instructionsPath = vscode.Uri.joinPath(workspaceUri, '.github', 'copilot-instructions.md');
    await writeFileWithDirectories(instructionsPath, instructionsContent);
}

/**
 * Validates that a workspace folder is available
 * @returns The first workspace folder URI, or throws an error if none available
 */
export function validateWorkspaceFolder(): vscode.Uri {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        throw new Error('No workspace folder is open. Please open a folder or workspace first.');
    }
    return workspaceFolders[0].uri;
}

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