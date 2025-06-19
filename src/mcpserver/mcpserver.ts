import * as vscode from 'vscode';
import { exists } from '../utils/executable';

export function add(context: vscode.ExtensionContext): void {
    // Register the MCP server definition provider
    context.subscriptions.push(
        vscode.lm.registerMcpServerDefinitionProvider('container-use', {
            onDidChangeMcpServerDefinitions: new vscode.EventEmitter<void>().event,
            provideMcpServerDefinitions: async (_: vscode.CancellationToken) => {
                return [
                    new vscode.McpStdioServerDefinition(
                        'container-use',
                        'cu',
                        ['stdio'],
                        {},
                        '0.0.5'
                    )
                ];
            },
            resolveMcpServerDefinition: async (server: vscode.McpStdioServerDefinition, _: vscode.CancellationToken) => {
                if (server.label === 'container-use') {
                    // Ensure the cu binary is available
                    if (!(await exists('cu', [], 'stdio'))) {
                        throw new Error('The "cu" binary is not available. Please ensure it is installed and accessible in your PATH.');
                    }
                    // Ensure the docker CLI is available
                    if (!(await exists('docker'))) {
                        throw new Error('The "docker" CLI is not available. Please ensure it is installed and accessible in your PATH.');
                    }
                }
                return server;
            }
        })
    );
}