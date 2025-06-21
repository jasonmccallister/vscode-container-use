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
                const environments = await cli.environments();
                if (environments.length === 0) {
                    vscode.window.showInformationMessage('No environments found to merge.');
                    return;
                }

                const selectedEnvironment = await vscode.window.showQuickPick(environments.map(env => env.name), {
                    placeHolder: 'Select an environment to watch',
                    title: 'Container Use: Watch Environment Logs'
                });

                if (!selectedEnvironment) {
                    console.log('No environment selected. Watch operation cancelled.');
                    return;
                }

                const terminal = vscode.window.createTerminal({
                    name: `Container Use Watch - ${selectedEnvironment}`,
                    cwd: workspacePath
                });
                terminal.show();
                terminal.sendText(`cu watch ${selectedEnvironment}`, true);
            });
        }));
}