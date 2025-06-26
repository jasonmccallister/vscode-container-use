import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';

interface McpServerConfig {
    type: string;
    command: string;
    args: string[];
}

interface McpConfiguration {
    servers: Record<string, McpServerConfig>;
}

const MCP_CONFIG_PATH = '.vscode/mcp.json';
const SERVER_NAME = 'container-use';

const DEFAULT_SERVER_CONFIG: McpServerConfig = {
    type: 'stdio',
    command: 'cu',
    args: ['stdio']
};

export const registerMcpConfigCommand = (context: vscode.ExtensionContext): void => {
    const mcpConfigCommand = vscode.commands.registerCommand('container-use.addMcpConfig', async () => {
        try {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                vscode.window.showErrorMessage('No workspace folder found. Please open a workspace first.');
                return;
            }

            await addMcpServerConfig(workspaceFolder.uri.fsPath);
            vscode.window.showInformationMessage('Container Use MCP server configuration added successfully!');
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to add MCP configuration: ${error}`);
        }
    });

    context.subscriptions.push(mcpConfigCommand);
};

const addMcpServerConfig = async (workspacePath: string): Promise<void> => {
    const configPath = path.join(workspacePath, MCP_CONFIG_PATH);
    const vscodeDir = path.dirname(configPath);

    // Ensure .vscode directory exists
    try {
        await fs.access(vscodeDir);
    } catch {
        await fs.mkdir(vscodeDir, { recursive: true });
    }

    let existingConfig: McpConfiguration;

    // Try to read existing configuration
    try {
        const existingContent = await fs.readFile(configPath, 'utf-8');
        existingConfig = JSON.parse(existingContent);
        
        // Validate structure
        if (!existingConfig.servers) {
            throw new Error('Invalid structure');
        }
    } catch {
        // Create new configuration if file doesn't exist or is invalid
        existingConfig = {
            servers: {}
        };
    }

    // Check if container-use server already exists
    if (existingConfig.servers[SERVER_NAME]) {
        const overwrite = await vscode.window.showWarningMessage(
            `Container Use MCP server configuration already exists. Do you want to overwrite it?`,
            'Yes',
            'No'
        );

        if (overwrite !== 'Yes') {
            return;
        }
    }

    // Add or update the container-use server configuration
    existingConfig.servers[SERVER_NAME] = DEFAULT_SERVER_CONFIG;

    // Write the updated configuration
    await fs.writeFile(configPath, JSON.stringify(existingConfig, null, 4), 'utf-8');
};
