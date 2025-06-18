import * as vscode from 'vscode';

/**
 * Manages the Container Use environments output channel in the bottom panel
 */
export class OutputChannel {
    private static outputChannel: vscode.OutputChannel | undefined;

    public static show(environments: string[]) {
        // Create or get the output channel
        if (!OutputChannel.outputChannel) {
            OutputChannel.outputChannel = vscode.window.createOutputChannel('Container Use');
        }

        // Clear previous content
        OutputChannel.outputChannel.clear();

        // Add header
        OutputChannel.outputChannel.appendLine('Container Use Environments');
        OutputChannel.outputChannel.appendLine('==========================');
        OutputChannel.outputChannel.appendLine('');

        if (environments.length === 0) {
            OutputChannel.outputChannel.appendLine('No environments found.');
            OutputChannel.outputChannel.appendLine('');
            OutputChannel.outputChannel.appendLine('Make sure you have created some environments first.');
            OutputChannel.outputChannel.appendLine('You can create environments using the container-use CLI.');
        } else {
            OutputChannel.outputChannel.appendLine(`Found ${environments.length} environment(s):`);
            OutputChannel.outputChannel.appendLine('');
            
            environments.forEach((env, index) => {
                OutputChannel.outputChannel!.appendLine(`${(index + 1).toString().padStart(2, ' ')}. ${env}`);
            });
            
            OutputChannel.outputChannel.appendLine('');
            OutputChannel.outputChannel.appendLine('Tip: Use "Container Use: Merge" to merge an environment into your workspace.');
        }

        // Show the output channel in the bottom panel
        OutputChannel.outputChannel.show();
    }

    public static dispose() {
        if (OutputChannel.outputChannel) {
            OutputChannel.outputChannel.dispose();
            OutputChannel.outputChannel = undefined;
        }
    }
}
