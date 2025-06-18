import * as vscode from 'vscode';

/**
 * Creates a file in the workspace.
 * @param {vscode.Uri} workspaceUri - The URI of the workspace folder.
 * @param {string} content - The content to write to the file.
 * @returns {Promise<vscode.Uri>} The URI of the created file.
 */
export function addFile(
    path: string,
    content: string,
    options: { overwrite?: boolean } = {}
): Thenable<vscode.Uri> {
    const uri = vscode.Uri.file(path);
    return vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf8')).then(
        () => uri,
        (error) => {
            if (error.code === 'FileExists' && options.overwrite) {
                return vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf8')).then(() => uri);
            }
            throw error;
        }
    );
}

/**
 * Validates that a workspace folder is open and returns its URI.
 * Throws an error if no workspace folder is open.
 * @returns {vscode.Uri} The URI of the first workspace folder.
 * @throws {Error} If no workspace folder is open.
 */
export function validate(): vscode.Uri {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        throw new Error('No workspace folder is open. Please open a folder or workspace first.');
    }
    return workspaceFolders[0].uri;
}