import * as vscode from 'vscode';
import ContainerUseCli from '../cli';

export default function mergeCommand(context: vscode.ExtensionContext, workspacePath: string) {
    context.subscriptions.push(vscode.commands.registerCommand('container-use.merge', async () => {

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
                placeHolder: 'Select an environment to merge into your current branch',
                title: 'Container Use: Merge Environment'
            });

            if (!selectedEnvironment) {
                console.log('No environment selected. Merge operation cancelled.');
                return;
            }

            const terminal = vscode.window.createTerminal({
                name: `Container Use Terminal - ${selectedEnvironment}`,
                cwd: workspacePath
            });
            terminal.show();
            terminal.sendText(`cu merge ${selectedEnvironment}`, true);

            const deleteAfterMerge = await vscode.window.showInformationMessage(
                `Environment "${selectedEnvironment}" has been successfully merged. Would you like to delete the environment now?`,
                'Delete Environment',
                'Keep Environment'
            );

            if (deleteAfterMerge === 'Delete Environment') {
                await vscode.window.withProgress({
                    location: vscode.ProgressLocation.Notification,
                    title: `Container Use: Deleting environment "${selectedEnvironment}"...`,
                    cancellable: false
                }, async () => {
                    const deleteResult = await cli.run(['delete', selectedEnvironment]);

                    if (!deleteResult.success || deleteResult.exitCode !== 0) {
                        vscode.window.showErrorMessage(`Failed to delete environment "${selectedEnvironment}": ${deleteResult.stderr}`);
                        return;
                    }

                    vscode.window.showInformationMessage(`Environment "${selectedEnvironment}" has been deleted successfully.`);
                });
            }
        });
    }));
}