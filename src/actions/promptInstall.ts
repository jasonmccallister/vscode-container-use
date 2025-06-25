import * as vscode from 'vscode';
import { exists } from '../utils/executable';

const binaryName = 'cu';

export class PromptToInstall {
    /**
     *  Checks if the Container Use binary is installed and prompts the user to install it if not.
     *  If the user chooses to install, it will execute the install command.
     *  If the user chooses to suppress the notice, it will update the global state to not show the prompt again.
     * 
     * This function will return false if the user chooses to not install or suppress the notice.
     * @param context Extension context to store state
     */
    static async show(context: vscode.ExtensionContext) {
        // has the user suppressed the install notice?
        if (context.globalState.get<boolean>('containerUse.suppressInstallNotice', false)) {
            return;
        }

        // check if the binary cu exists and that the --help command contains the string stdio
        const isInstalled = await exists(binaryName, ['--help'], 'stdio');


        // if the binary is installed, return true
        if (isInstalled) {
            console.info(`Container Use (${binaryName}) is installed.`);
            return;
        }

        // show the user a prompt to install the binary
        console.warn(`Container Use (${binaryName}) is not installed.`);

        const message = vscode.window.showWarningMessage(
            'Container Use is not installed. Commands will not work until it is installed.',
            'Install Now',
            'Don\'t Show Again',
            'Remind Me Later'
        );

        message.then(async (response) => {
            if (response === 'Install Now') {
                console.log('User chose to install Container Use.');
                return vscode.commands.executeCommand('container-use.install');
            } else if (response === 'Don\'t Show Again') {
                console.log('User chose to suppress the install notice for Container Use.');
                await context.globalState.update('containerUse.suppressInstallNotice', true);
            }
        });
    }
}