import * as vscode from 'vscode';

// Constants to eliminate magic strings
const MCP_SERVER_CONFIG = {
    ID: 'container-use',
    COMMAND: 'cu',
    ARGS: ['stdio'] as string[]
} as const;

interface McpServerConfig {
    context: vscode.ExtensionContext;
    version: string;
    serverId?: string;
    command?: string;
    args?: string[];
}

interface McpServerProvider {
    onDidChangeMcpServerDefinitions: vscode.Event<void>;
    provideMcpServerDefinitions: (token: vscode.CancellationToken) => Promise<vscode.McpStdioServerDefinition[]>;
    resolveMcpServerDefinition: (server: vscode.McpStdioServerDefinition, token: vscode.CancellationToken) => Promise<vscode.McpStdioServerDefinition>;
}

const createMcpServerProvider = (config: McpServerConfig): McpServerProvider => {
    const {
        version,
        serverId = MCP_SERVER_CONFIG.ID,
        command = MCP_SERVER_CONFIG.COMMAND,
        args = MCP_SERVER_CONFIG.ARGS
    } = config;

    return {
        onDidChangeMcpServerDefinitions: new vscode.EventEmitter<void>().event,

        provideMcpServerDefinitions: async (_token: vscode.CancellationToken): Promise<vscode.McpStdioServerDefinition[]> => {
            return [
                new vscode.McpStdioServerDefinition(serverId, command, [...args], {}, version)
            ];
        },

        resolveMcpServerDefinition: async (server: vscode.McpStdioServerDefinition, _token: vscode.CancellationToken): Promise<vscode.McpStdioServerDefinition> => {
            return server;
        }
    };
};

export const registerMcpServer = ({ context, version, serverId, command, args }: McpServerConfig): void => {
    const provider = createMcpServerProvider({
        context,
        version,
        serverId,
        command,
        args
    });

    const registration = vscode.lm.registerMcpServerDefinitionProvider(
        serverId || MCP_SERVER_CONFIG.ID,
        provider
    );

    context.subscriptions.push(registration);
};

// Legacy function for backward compatibility
export const add = (context: vscode.ExtensionContext, version: string): void => {
    registerMcpServer({ context, version });
};