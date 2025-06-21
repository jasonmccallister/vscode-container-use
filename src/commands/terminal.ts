import * as vscode from 'vscode';
import ContainerUseCli from '../cli';
import { ensureInstalled } from '../extension';

export default function terminalCommand(context: vscode.ExtensionContext, workspacePath: string) {
    context.subscriptions.push(vscode.commands.registerCommand('container-use.terminal', async () => {
        // Check if Container Use is installed before proceeding
        if (!await ensureInstalled(context)) {
            return;
        }
        
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
                placeHolder: 'Select an environment to access its terminal',
                title: 'Container Use: Access Environment Terminal'
            });

            if (!selectedEnvironment) {
                console.log('No environment selected. Terminal operation cancelled.');
                return;
            }

            const terminal = vscode.window.createTerminal({
                name: `Container Use Terminal - ${selectedEnvironment}`,
                cwd: workspacePath
            });
            terminal.show();
            terminal.sendText(`cu terminal ${selectedEnvironment}`, true);
        });
    }));
}