import * as vscode from 'vscode';
import ContainerUseCli from '../cli';

export default async function watchCommand(context: vscode.ExtensionContext, workspacePath: string) {
    context.subscriptions.push(
        vscode.commands.registerCommand('container-use.watch', async () => {
            // Create CLI instance
            const cli = new ContainerUseCli();
            cli.setWorkspacePath(workspacePath);

            // Show progress while fetching environments
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Container Use: Fetching environments...',
                cancellable: false
            }, async () => {
                const terminal = vscode.window.createTerminal({
                    name: `Container Use`,
                    cwd: workspacePath
                });
                terminal.show();
                terminal.sendText(`cu watch`, true);
            });
        }));
}