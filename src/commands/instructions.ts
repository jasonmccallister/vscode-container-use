import * as vscode from 'vscode';

const instructionsContent = `ALWAYS use ONLY Environments for ANY and ALL file, code, or shell operations—NO EXCEPTIONS—even for simple or generic requests.
            
DO NOT install or use the git cli with the environment_run_cmd tool. All environment tools will handle git operations for you. Changing ".git" yourself will compromise the integrity of your environment.

You MUST inform the user how to view your work using \`git checkout <branch_name>\`. Failure to do this will make your work inaccessible to others.`;

export default function instructionCommand(context: vscode.ExtensionContext, workspacePath: string) {
    context.subscriptions.push(vscode.commands.registerCommand('container-use.instructions', async () => {
        try {
            // Ask user about Copilot instructions
            const addInstructions = await vscode.window.showInformationMessage(
                'Add the (optional) Copilot instructions for Container Use?',
                { modal: true },
                'Yes',
                'No'
            );

            if (addInstructions !== 'Yes') {
                vscode.window.showInformationMessage('Copilot instructions not added.');
                return;
            }

            // Add the instructions to the .github/copilot-instructions.md file
            await addFile(
                workspacePath,
                '.github/copilot-instructions.md',
                instructionsContent,
                { overwrite: false }
            );

            vscode.window.showInformationMessage(
                'Container Use instructions have been added to the .github/copilot-instructions.md file.'
            );
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to add instructions: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }));
}

async function addFile(
    workspace: string,
    relativePath: string,
    content: string,
    options: { overwrite?: boolean } = {}
): Promise<vscode.Uri> {
    const uri = vscode.Uri.joinPath(vscode.Uri.file(workspace), relativePath);

    if (!content) {
        throw new Error('Content cannot be empty');
    }
    if (!relativePath) {
        throw new Error('Relative path cannot be empty');
    }

    try {
        // First, ensure the directory exists
        const parentDir = vscode.Uri.joinPath(uri, '..');
        await vscode.workspace.fs.createDirectory(parentDir);

        // Check if the file already exists and handle accordingly
        let fileExists = false;
        try {
            await vscode.workspace.fs.stat(uri);
            fileExists = true;
        } catch (error: any) {
            // If the file does not exist, we can proceed to create it
            if (error.code !== 'FileNotFound') {
                throw new Error(`Failed to check file existence: ${error.message}`);
            }
        }

        if (fileExists && !options.overwrite) {
            const overwrite = await vscode.window.showWarningMessage(
                `File ${relativePath} already exists. Do you want to overwrite it?`,
                { modal: true },
                'Yes',
                'No'
            );
            if (overwrite !== 'Yes') {
                vscode.window.showInformationMessage('File creation cancelled.');
                return uri; // Return the URI without writing
            }
        }

        // Write the file
        await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf8'));
        return uri;
    } catch (error: any) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        await vscode.window.showErrorMessage('Failed to create file: ' + errorMessage);
        throw error;
    }
}