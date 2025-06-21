import * as vscode from 'vscode';

export default function resetPreferencesCommand(context: vscode.ExtensionContext) {
    context.subscriptions.push(vscode.commands.registerCommand('container-use.resetPreferences', async () => {
        try {
            // Reset the install notice suppression preference
            await context.globalState.update('containerUse.suppressInstallNotice', undefined);
            
            // Reset the install method preference
            const config = vscode.workspace.getConfiguration('containerUse');
            await config.update('installMethod', '', vscode.ConfigurationTarget.Global);
            await config.update('commandExecution', 'terminal', vscode.ConfigurationTarget.Global);
            
            vscode.window.showInformationMessage('✅ Container Use preferences have been reset. Install notifications will be shown again and settings have been reset to defaults.');
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to reset preferences: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }));
}
