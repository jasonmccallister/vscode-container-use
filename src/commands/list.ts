import * as vscode from 'vscode';
import ContainerUseCli from '../cli';

export default function listCommand(context: vscode.ExtensionContext, workspacePath: string) {
    context.subscriptions.push(vscode.commands.registerCommand('container-use.list', async () => {
        const cli = new ContainerUseCli();
        cli.setWorkspacePath(workspacePath);

        // Show progress while fetching environments
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Container Use: Fetching environments...',
            cancellable: false
        }, async () => {
            const result = await cli.run(['list']);

            if (!result.success || result.exitCode !== 0) {
                vscode.window.showErrorMessage(`Failed to get environments: ${result.stderr}`);
                return;
            }

            // break each line of the output into an array
            if (!result.stdout) {
                vscode.window.showErrorMessage('No environments found or command failed.');
                return;
            }
            const environments = result.stdout.split('\n').filter(line => line.trim() !== '');
            if (environments.length === 0) {
                vscode.window.showInformationMessage('No environments found.');
                return;
            }

            // open the output channel and display the environments
            const outputChannel = vscode.window.createOutputChannel('Container Use Environments');
            outputChannel.clear();
            outputChannel.appendLine('Available Container Use Environments:');
            environments.forEach(env => {
                outputChannel.appendLine(`- ${env}`);
            });
            outputChannel.appendLine(`\nTotal environments: ${environments.length}`);
            outputChannel.show();
        });
    }));
}