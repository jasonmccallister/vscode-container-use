import * as vscode from 'vscode';
import { ensureBinaryExists } from './fileOperations';
import * as cmd from './commands/commands';

export function activate(context: vscode.ExtensionContext) {
    const didChangeEmitter = new vscode.EventEmitter<void>();

    // register commands
    cmd.addCommands(context);

    context.subscriptions.push(vscode.lm.registerMcpServerDefinitionProvider('container-use', {
        onDidChangeMcpServerDefinitions: didChangeEmitter.event,
        provideMcpServerDefinitions: async (_: vscode.CancellationToken) => {
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
        resolveMcpServerDefinition: async (server: vscode.McpStdioServerDefinition, _: vscode.CancellationToken) => {
            console.error(`Resolving MCP server definition for: ${server.label}`);
            if (server.label === 'container-use') {
                // check for the cu binary
                if (!(await ensureBinaryExists('cu'))) {
                    console.error('The "cu" binary is not available. Please ensure it is installed and accessible in your PATH.');
                    vscode.window.showErrorMessage('The "cu" binary is not available. Please ensure it is installed and accessible in your PATH.');
                }

                // check for the docker cli
                if (!(await ensureBinaryExists('docker'))) {
                    console.error('The "docker" CLI is not available. Please ensure it is installed and accessible in your PATH.');
                    vscode.window.showErrorMessage('The "docker" CLI is not available. Please ensure it is installed and accessible in your PATH.');
                }
            }

            // Return undefined to indicate that the server should not be started or throw an error
            // If there is a pending tool call, the editor will cancel it and return an error message
            // to the language model.
            return server;
        }
    }));
}
