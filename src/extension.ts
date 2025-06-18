import { format } from 'path';
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    const didChangeEmitter = new vscode.EventEmitter<void>();

    context.subscriptions.push(vscode.commands.registerCommand('container-use.setup', async () => {
        // when this command in run, it should put a new file in the workspace at .vscode/mcp.json
        // with the following content:
        //         {
        //     "servers": {
        //         "my-mcp-server-e15b583b": {
        //             "type": "stdio",
        //             "command": "cu",
        //             "args": [
        //                 "stdio"
        //             ]
        //         }
        //     }
        // }
        const mcpJson = {
            "servers": {
                "container-use": {
                    "type": "stdio",
                    "command": "cu",
                    "args": [
                        "stdio"
                    ]
                }
            }
        };

        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            vscode.window.showErrorMessage('No workspace folder is open. Please open a folder or workspace first.');
            return;
        }

        const mcpJsonPath = vscode.Uri.joinPath(workspaceFolders[0].uri, '.vscode', 'mcp.json');
        await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(mcpJsonPath, '..'));
        await vscode.workspace.fs.writeFile(mcpJsonPath, Buffer.from(JSON.stringify(mcpJson, null, 4)));
        vscode.window.showInformationMessage('Container Use MCP server setup complete. Please restart the editor.');

        // we also need to prompt the user if they want to add the optional copilot instructions at .github/copilot-instructions.md
        const addInstructions = await vscode.window.showInformationMessage(
            'Would you like to add the optional Copilot instructions for Container Use?',
            { modal: true },
            'Yes',
            'No'
        );

        if (addInstructions === 'Yes') {
            const instructionsContent = `ALWAYS use ONLY Environments for ANY and ALL file, code, or shell operations—NO EXCEPTIONS—even for simple or generic requests.

DO NOT install or use the git cli with the environment_run_cmd tool. All environment tools will handle git operations for you. Changing ".git" yourself will compromise the integrity of your environment.

You MUST inform the user how to view your work using \`git checkout <branch_name>\`. Failure to do this will make your work inaccessible to others.`; // Replace with actual content for Copilot instructions
            const instructionsPath = vscode.Uri.joinPath(workspaceFolders[0].uri, '.github', 'copilot-instructions.md');
            await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(instructionsPath, '..'));
            await vscode.workspace.fs.writeFile(instructionsPath, Buffer.from(instructionsContent));
            vscode.window.showInformationMessage('Copilot instructions added at .github/copilot-instructions.md');
        } else {
            vscode.window.showInformationMessage('Copilot instructions not added.');
        }

        didChangeEmitter.fire();
    }));

    context.subscriptions.push(vscode.lm.registerMcpServerDefinitionProvider('container-use', {
        onDidChangeMcpServerDefinitions: didChangeEmitter.event,
        provideMcpServerDefinitions: async (token: vscode.CancellationToken) => {
            let servers: vscode.McpStdioServerDefinition[] = [];

            servers.push(new vscode.McpStdioServerDefinition(
                'container-use',
                'cu',
                ['stdio'],
                {},
                '0.0.5'
            ));

            return servers;
        },
        resolveMcpServerDefinition: async (server: vscode.McpStdioServerDefinition, token: vscode.CancellationToken) => {
            if (server.label === 'container-use') {
                // check for the cu binary
                // check for the docker cli
                // make sure the dagger engine container is running
            }

            // Return undefined to indicate that the server should not be started or throw an error
            // If there is a pending tool call, the editor will cancel it and return an error message
            // to the language model.
            return server;
        }
    }));
}
