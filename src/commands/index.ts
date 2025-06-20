import * as vscode from 'vscode';
import installCommand from './install';
import listCommand from './list';
import logCommand from './log';

export default class Commands {
    public static register(context: vscode.ExtensionContext, workspacePath: string) {
        installCommand(context);
        listCommand(context, workspacePath);
        logCommand(context, workspacePath);
    }
}