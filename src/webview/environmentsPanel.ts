import * as vscode from 'vscode';

/**
 * Manages the Container Use environments view in the bottom panel
 */
export class EnvironmentsPanel {
    private static outputChannel: vscode.OutputChannel | undefined;

    public static show(environments: string[]) {
        // Create or get the output channel
        if (!EnvironmentsPanel.outputChannel) {
            EnvironmentsPanel.outputChannel = vscode.window.createOutputChannel('Container Use');
        }

        // Clear previous content
        EnvironmentsPanel.outputChannel.clear();

        // Add header
        EnvironmentsPanel.outputChannel.appendLine('Container Use Environments');
        EnvironmentsPanel.outputChannel.appendLine('==========================');
        EnvironmentsPanel.outputChannel.appendLine('');

        if (environments.length === 0) {
            EnvironmentsPanel.outputChannel.appendLine('No environments found.');
            EnvironmentsPanel.outputChannel.appendLine('');
            EnvironmentsPanel.outputChannel.appendLine('Make sure you have created some environments first.');
            EnvironmentsPanel.outputChannel.appendLine('You can create environments using the container-use CLI.');
        } else {
            EnvironmentsPanel.outputChannel.appendLine(`Found ${environments.length} environment(s):`);
            EnvironmentsPanel.outputChannel.appendLine('');
            
            environments.forEach((env, index) => {
                EnvironmentsPanel.outputChannel!.appendLine(`${(index + 1).toString().padStart(2, ' ')}. ${env}`);
            });
            
            EnvironmentsPanel.outputChannel.appendLine('');
            EnvironmentsPanel.outputChannel.appendLine('Tip: Use "Container Use: Merge" to merge an environment into your workspace.');
        }

        // Show the output channel in the bottom panel
        EnvironmentsPanel.outputChannel.show();
    }

    public static dispose() {
        if (EnvironmentsPanel.outputChannel) {
            EnvironmentsPanel.outputChannel.dispose();
            EnvironmentsPanel.outputChannel = undefined;
        }
    }
}
