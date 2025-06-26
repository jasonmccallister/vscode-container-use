import * as vscode from 'vscode';
import { createContainerUseCli } from '../cli/cli';
import type ContainerUseCli from '../cli/cli';

// Constants to eliminate magic strings and numbers
const TREE_VIEW_ID = 'containerUseTreeView';
const ICON_NAME = 'server-environment';
const CONTEXT_VALUE = 'environment';

const TREE_VIEW_OPTIONS = {
    SHOW_COLLAPSE_ALL: true,
    CAN_SELECT_MANY: false
} as const;

const COMMANDS = {
    REFRESH: 'container-use.refreshEnvironments',
    VIEW_ENVIRONMENTS: 'container-use.viewEnvironments'
} as const;

const MESSAGES = {
    NO_ENVIRONMENTS: 'No environments available.',
    FAILED_TO_LOAD: 'Failed to load environments'
} as const;

interface ItemConfig {
    label: string;
    description?: string;
    collapsibleState?: vscode.TreeItemCollapsibleState;
    command?: vscode.Command;
    children?: Item[];
    environmentId?: string;
    tooltip?: string;
}

export class Item extends vscode.TreeItem {
    children?: Item[];
    environmentId?: string;

    constructor({
        label,
        description,
        collapsibleState = vscode.TreeItemCollapsibleState.None,
        command,
        children,
        environmentId,
        tooltip
    }: ItemConfig) {
        super(label, collapsibleState);

        this.command = command;
        this.children = children;
        this.environmentId = environmentId;
        this.iconPath = new vscode.ThemeIcon(ICON_NAME);
        this.tooltip = tooltip || (description ? `${label}\n${description}` : label);
        this.description = description;
        this.contextValue = CONTEXT_VALUE;
    }
}

interface DataProviderConfig {
    workspacePath: string;
    cli?: ContainerUseCli;
}

interface TreeViewConfig {
    workspacePath?: string;
    cli?: ContainerUseCli;
}

// Implement TreeDataProvider for Container Use environments
export class DataProvider implements vscode.TreeDataProvider<Item> {
    private readonly _onDidChangeTreeData = new vscode.EventEmitter<Item | Item[] | void | null | undefined>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private items: Item[] = [];
    private readonly workspacePath: string;
    private readonly cli: ContainerUseCli;

    constructor({ workspacePath, cli }: DataProviderConfig) {
        this.workspacePath = workspacePath;
        this.cli = cli || createContainerUseCli({ workspacePath });
        this.loadEnvironments();
    }

    private loadEnvironments = async (): Promise<void> => {
        try {
            const environments = await this.cli.environments();
            this.items = environments.map(env => {
                // Use title as description, with timestamps as tooltip information
                const tooltipParts: string[] = [];
                if (env.title) {
                    tooltipParts.push(env.title);
                }
                if (env.created) {
                    tooltipParts.push(`Created: ${env.created}`);
                }
                if (env.updated) {
                    tooltipParts.push(`Updated: ${env.updated}`);
                }
                const tooltip = tooltipParts.join('\n');

                return new Item({
                    label: env.id, // Use ID as the main display name
                    description: env.title, // Use title as the description
                    environmentId: env.id,
                    collapsibleState: vscode.TreeItemCollapsibleState.None,
                    tooltip
                });
            });
            
            if (this.items.length === 0) {
                // Show a placeholder item when no environments exist
                this.items = [
                    new Item({
                        label: MESSAGES.NO_ENVIRONMENTS,
                        collapsibleState: vscode.TreeItemCollapsibleState.None
                    })
                ];
            }
            
            this._onDidChangeTreeData.fire();
        } catch (error) {
            vscode.window.showErrorMessage(`${MESSAGES.FAILED_TO_LOAD}: ${error}`);
            this.items = [];
            this._onDidChangeTreeData.fire();
        }
    };

    refresh = (): void => {
        this.loadEnvironments();
    };

    getTreeItem = (element: Item): vscode.TreeItem => element;

    getChildren = (element?: Item): Item[] => {
        if (!element) {
            return this.items;
        }
        return element.children ?? [];
    };

    getParent = (element: Item): Item | undefined => {
        // Use find for better readability and early termination
        return this.items.find(item =>
            item.children?.includes(element)
        );
    };
}

export const registerTreeView = (context: vscode.ExtensionContext, config: TreeViewConfig = {}): void => {
    const {
        workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '',
        cli
    } = config;

    const dataProvider = new DataProvider({ workspacePath, cli });
    
    // Register refresh command
    const refreshCommand = vscode.commands.registerCommand(COMMANDS.REFRESH, () => {
        dataProvider.refresh();
    });
    
    const treeView = vscode.window.createTreeView(TREE_VIEW_ID, {
        treeDataProvider: dataProvider,
        showCollapseAll: TREE_VIEW_OPTIONS.SHOW_COLLAPSE_ALL,
        canSelectMany: TREE_VIEW_OPTIONS.CAN_SELECT_MANY
    });

    // Register view environments command to focus/reveal the tree view
    const viewEnvironmentsCommand = vscode.commands.registerCommand(COMMANDS.VIEW_ENVIRONMENTS, async () => {
        // Show the Container Use view container in the activity bar
        await vscode.commands.executeCommand('workbench.view.extension.containerUseViewContainer');
        
        // Focus on the tree view specifically
        await vscode.commands.executeCommand(`${TREE_VIEW_ID}.focus`);
    });

    context.subscriptions.push(treeView, refreshCommand, viewEnvironmentsCommand);
};