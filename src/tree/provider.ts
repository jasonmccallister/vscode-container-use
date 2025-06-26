import * as vscode from 'vscode';

export class Item extends vscode.TreeItem {
    children?: Item[];

    constructor(
        label: string,
        collapsibleState: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.None,
        command?: vscode.Command
    ) {
        super(label, collapsibleState);

        // Set command if provided
        if (command) {
            this.command = command;
        }

        this.iconPath = new vscode.ThemeIcon('server-environment'); // Use a server environment icon
        this.tooltip = `Environment: ${label}`;
        this.contextValue = 'environment';
    }
}

// Implement TreeDataProvider for Dagger functions
export class DataProvider implements vscode.TreeDataProvider<Item> {
    private _onDidChangeTreeData: vscode.EventEmitter<Item | Item[] | void | null | undefined> = new vscode.EventEmitter<Item | Item[] | void | null | undefined>();
    readonly onDidChangeTreeData: vscode.Event<Item | Item[] | void | null | undefined> = this._onDidChangeTreeData.event;

    private items: Item[] = [];
    private workspacePath: string;

    constructor(workspacePath: string) {
        this.workspacePath = workspacePath;
        // create 5 fake items for demonstration
        for (let i = 1; i <= 5; i++) {
            const item = new Item(`Environment ${i}`, vscode.TreeItemCollapsibleState.Collapsed);
            this.items.push(item);
        }
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: Item): vscode.TreeItem {
        return element;
    }

    getChildren(element?: Item): Item[] {
        if (!element) {
            return this.items;
        }
        return element.children ?? [];
    }

    getParent(element: Item): Item | undefined {
        // Find parent by searching through all function items
        for (const item of this.items) {
            if (item.children?.includes(element)) {
                return item;
            }
        }

        return undefined;
    }
}