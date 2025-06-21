import * as vscode from 'vscode';
import ContainerUseCli from '../cli';

export default function listCommand(context: vscode.ExtensionContext, workspacePath: string) {
    let outputChannel: vscode.OutputChannel | undefined;

    context.subscriptions.push(vscode.commands.registerCommand('container-use.list', async () => {
        const cli = new ContainerUseCli();
        cli.setWorkspacePath(workspacePath);

        if (!cli.isInstalled()) {
            vscode.window.showErrorMessage('Container Use is not installed. Please install it first.');
            return;
        }

        // Show progress while fetching environments
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Container Use: Fetching environments...',
            cancellable: false
        }, async () => {
            const environments = await cli.environments();

            // Find or create the Container Use output channel
            if (!outputChannel) {
                outputChannel = vscode.window.createOutputChannel('Container Use');
                // Store the output channel in context subscriptions for cleanup
                context.subscriptions.push(outputChannel);
            }

            // Clear previous content and add new environment list
            outputChannel.clear();
            outputChannel.appendLine('Container Use Environments:');
            outputChannel.appendLine('==========================');
            outputChannel.appendLine('');

            if (environments.length === 0) {
                outputChannel.appendLine('No environments found.');
                vscode.window.showInformationMessage('No environments found.');
            } else {
                environments.forEach((env, index) => {
                    outputChannel!.appendLine(`${index + 1}. ${env.name}`);
                });
                outputChannel!.appendLine('');
                outputChannel!.appendLine(`Total environments: ${environments.length}`);
            }

            // Show the output channel
            outputChannel.show();
        });
    }));
}