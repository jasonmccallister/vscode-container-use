import * as vscode from 'vscode';

interface ItemConfig {
    label: string;
    collapsibleState?: vscode.TreeItemCollapsibleState;
    command?: vscode.Command;
    children?: Item[];
}

export class Item extends vscode.TreeItem {
    children?: Item[];

    constructor({
        label,
        collapsibleState = vscode.TreeItemCollapsibleState.None,
        command,
        children
    }: ItemConfig) {
        super(label, collapsibleState);

        this.command = command;
        this.children = children;
        this.iconPath = new vscode.ThemeIcon('server-environment');
        this.tooltip = `Environment: ${label}`;
        this.contextValue = 'environment';
    }
}

interface DataProviderConfig {
    workspacePath: string;
    itemCount?: number;
}

interface TreeViewConfig {
    workspacePath?: string;
    itemCount?: number;
}

// Implement TreeDataProvider for Container Use environments
export class DataProvider implements vscode.TreeDataProvider<Item> {
    private readonly _onDidChangeTreeData = new vscode.EventEmitter<Item | Item[] | void | null | undefined>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private items: Item[] = [];
    private readonly workspacePath: string;

    constructor({ workspacePath, itemCount = 5 }: DataProviderConfig) {
        this.workspacePath = workspacePath;
        this.initializeItems(itemCount);
    }

    private initializeItems = (count: number): void => {
        this.items = Array.from({ length: count }, (_, index) =>
            new Item({
                label: `Environment ${index + 1}`,
                collapsibleState: vscode.TreeItemCollapsibleState.Collapsed
            })
        );
    };

    refresh = (): void => {
        this._onDidChangeTreeData.fire();
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
        itemCount = 5
    } = config;

    const dataProvider = new DataProvider({ workspacePath, itemCount });
    
    const treeView = vscode.window.createTreeView('containerUseTreeView', {
        treeDataProvider: dataProvider,
        showCollapseAll: true,
        canSelectMany: false
    });

    context.subscriptions.push(treeView);
};