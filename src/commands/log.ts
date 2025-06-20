import * as vscode from 'vscode';
import ContainerUseCli from '../cli';

export default async function logCommand(context: vscode.ExtensionContext, workspacePath: string) {
    context.subscriptions.push(
        vscode.commands.registerCommand('container-use.log', async () => {
            // Create CLI instance
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

                const selectedEnvironment = await vscode.window.showQuickPick(environments, {
                    placeHolder: 'Select an environment to view logs',
                    title: 'Container Use: View Environment Logs'
                });

                if (!selectedEnvironment) {
                    console.log('No environment selected. Log operation cancelled.');
                    return;
                }

                const terminal = vscode.window.createTerminal({
                    name: `Container Use Log - ${selectedEnvironment}`,
                    cwd: vscode.workspace.workspaceFolders?.[0].uri.fsPath || undefined
                });
                terminal.show();
                terminal.sendText(`cu log ${selectedEnvironment}`, true);
            });
        }));
}