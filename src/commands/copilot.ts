import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

// Constants to eliminate magic strings
const COMMANDS = {
    ADD_COPILOT_INSTRUCTIONS: 'container-use.addCopilotInstructions'
} as const;

const MESSAGES = {
    INSTRUCTIONS_PROMPT: 'Would you like to add Container Use instructions to your workspace? This will help GitHub Copilot understand how to use environments properly.',
    SUCCESS: 'Container Use instructions have been added to your workspace!',
    ERROR_NO_WORKSPACE: 'No workspace folder found. Please open a workspace first.',
    ERROR_FILE_CREATION: 'Failed to create instructions file',
    ALREADY_EXISTS: 'Instructions file already exists. Would you like to overwrite it?',
    OVERWRITTEN: 'Container Use instructions have been updated!'
} as const;

const ACTION_BUTTONS = {
    ADD_INSTRUCTIONS: 'Add Instructions',
    CANCEL: 'Cancel',
    OVERWRITE: 'Overwrite',
    KEEP_EXISTING: 'Keep Existing'
} as const;

const FILE_CONFIG = {
    DIRECTORY: '.github',
    SUBDIRECTORY: 'copilot_instructions',
    FILENAME: 'container-use.md',
    ENCODING: 'utf8' as const
} as const;

const COPILOT_INSTRUCTIONS = `# Container Use Instructions

ALWAYS use ONLY Environments for ANY and ALL file, code, or shell operations—NO EXCEPTIONS—even for simple or generic requests.

DO NOT install or use the git cli with the environment_run_cmd tool. All environment tools will handle git operations for you. Changing ".git" yourself will compromise the integrity of your environment.

You MUST inform the user how to view your work using \`cu log <env_id>\` AND \`cu checkout <env_id>\`. Failure to do this will make your work inaccessible to others.

## Key Points:

1. **Environment First**: Always create or use an environment for any development task
2. **No Direct Git**: Never use git commands directly - environments handle version control
3. **User Guidance**: Always provide \`cu log\` and \`cu checkout\` commands for user access
4. **No Exceptions**: Even simple tasks should use environments for consistency

## Example Commands:

- View environment logs: \`cu log <env_id>\`
- Checkout environment: \`cu checkout <env_id>\`
- List environments: \`cu list\`
- Create environment: \`cu create <name>\`
`;

interface CopilotCommandConfig {
    context: vscode.ExtensionContext;
}

const getInstructionsFilePath = (): string | null => {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        return null;
    }

    return path.join(
        workspaceFolder.uri.fsPath,
        FILE_CONFIG.DIRECTORY,
        FILE_CONFIG.SUBDIRECTORY,
        FILE_CONFIG.FILENAME
    );
};

const ensureDirectoryExists = async (filePath: string): Promise<void> => {
    const directory = path.dirname(filePath);
    
    try {
        await fs.promises.access(directory);
    } catch {
        await fs.promises.mkdir(directory, { recursive: true });
    }
};

const fileExists = async (filePath: string): Promise<boolean> => {
    try {
        await fs.promises.access(filePath);
        return true;
    } catch {
        return false;
    }
};

const writeInstructionsFile = async (filePath: string): Promise<void> => {
    await ensureDirectoryExists(filePath);
    await fs.promises.writeFile(filePath, COPILOT_INSTRUCTIONS, FILE_CONFIG.ENCODING);
};

const handleExistingFile = async (): Promise<boolean> => {
    const action = await vscode.window.showWarningMessage(
        MESSAGES.ALREADY_EXISTS,
        ACTION_BUTTONS.OVERWRITE,
        ACTION_BUTTONS.KEEP_EXISTING
    );

    return action === ACTION_BUTTONS.OVERWRITE;
};

const addCopilotInstructions = async (): Promise<void> => {
    try {
        const filePath = getInstructionsFilePath();
        
        if (!filePath) {
            vscode.window.showErrorMessage(MESSAGES.ERROR_NO_WORKSPACE);
            return;
        }

        const exists = await fileExists(filePath);
        
        if (exists) {
            const shouldOverwrite = await handleExistingFile();
            if (!shouldOverwrite) {
                return;
            }
        }

        const action = await vscode.window.showInformationMessage(
            MESSAGES.INSTRUCTIONS_PROMPT,
            ACTION_BUTTONS.ADD_INSTRUCTIONS,
            ACTION_BUTTONS.CANCEL
        );

        if (action !== ACTION_BUTTONS.ADD_INSTRUCTIONS) {
            return;
        }

        await writeInstructionsFile(filePath);
        
        const successMessage = exists ? MESSAGES.OVERWRITTEN : MESSAGES.SUCCESS;
        vscode.window.showInformationMessage(successMessage);

    } catch (error) {
        vscode.window.showErrorMessage(`${MESSAGES.ERROR_FILE_CREATION}: ${error}`);
    }
};

export const registerCopilotCommand = ({ context }: CopilotCommandConfig): void => {
    const copilotCommand = vscode.commands.registerCommand(
        COMMANDS.ADD_COPILOT_INSTRUCTIONS,
        addCopilotInstructions
    );

    context.subscriptions.push(copilotCommand);
};
