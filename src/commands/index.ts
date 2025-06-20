import * as vscode from 'vscode';
import installCommand from './install';
import listCommand from './list';
import logCommand from './log';
import terminalCommand from './terminal';
import deleteCommand from './delete';
import instructionCommand from './instructions';
import watchCommand from './watch';

export default class Commands {
    public static register(context: vscode.ExtensionContext, workspacePath: string) {
        deleteCommand(context, workspacePath);
        installCommand(context);
        instructionCommand(context, workspacePath);
        listCommand(context, workspacePath);
        logCommand(context, workspacePath);
        terminalCommand(context, workspacePath);
        watchCommand(context, workspacePath);
    }
}