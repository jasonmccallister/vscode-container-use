import * as vscode from 'vscode';
import ContainerUseCli from '../cli';
import { ensureInstalled } from '../extension';

export default async function logCommand(context: vscode.ExtensionContext, workspacePath: string) {
    context.subscriptions.push(
        vscode.commands.registerCommand('container-use.log', async () => {
            // Check if Container Use is installed before proceeding
            if (!await ensureInstalled(context)) {
                return;
            }
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
                    placeHolder: 'Select an environment to view logs',
                    title: 'Container Use: View Environment Logs'
                });

                if (!selectedEnvironment) {
                    console.log('No environment selected. Log operation cancelled.');
                    return;
                }

                const terminal = vscode.window.createTerminal({
                    name: `Container Use Log - ${selectedEnvironment}`,
                    cwd: workspacePath
                });
                terminal.show();
                terminal.sendText(`cu log ${selectedEnvironment}`, true);
            });
        }));
}