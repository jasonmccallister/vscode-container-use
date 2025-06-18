import * as vscode from 'vscode';

/**
 * Manages the Container Use environments webview panel
 */
export class EnvironmentsPanel {
    public static currentPanel: EnvironmentsPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];

    public static createOrShow(extensionUri: vscode.Uri, environments: string[]) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // If we already have a panel, show it
        if (EnvironmentsPanel.currentPanel) {
            EnvironmentsPanel.currentPanel._panel.reveal(column);
            EnvironmentsPanel.currentPanel._updateContent(environments);
            return;
        }

        // Otherwise, create a new panel
        const panel = vscode.window.createWebviewPanel(
            'containerUseEnvironments',
            'Container Use Environments',
            column || vscode.ViewColumn.One,
            {
                // Enable javascript in the webview
                enableScripts: true,
                // And restrict the webview to only loading content from our extension's `media` directory
                localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')]
            }
        );

        EnvironmentsPanel.currentPanel = new EnvironmentsPanel(panel, extensionUri);
        EnvironmentsPanel.currentPanel._updateContent(environments);
    }

    public static revive(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        EnvironmentsPanel.currentPanel = new EnvironmentsPanel(panel, extensionUri);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        this._panel = panel;
        this._extensionUri = extensionUri;

        // Set the webview's initial html content
        this._updateContent([]);

        // Listen for when the panel is disposed
        // This happens when the user closes the panel or when the panel is closed programmatically
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Update the content based on view changes
        this._panel.onDidChangeViewState(
            e => {
                if (this._panel.visible) {
                    // Panel became visible, could refresh content here if needed
                }
            },
            null,
            this._disposables
        );

        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'refresh':
                        vscode.commands.executeCommand('container-use.list');
                        return;
                }
            },
            null,
            this._disposables
        );
    }

    public dispose() {
        EnvironmentsPanel.currentPanel = undefined;

        // Clean up our resources
        this._panel.dispose();

        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    private _updateContent(environments: string[]) {
        const webview = this._panel.webview;
        this._panel.title = `Container Use Environments (${environments.length})`;
        this._panel.webview.html = this._getHtmlForWebview(webview, environments);
    }

    private _getHtmlForWebview(webview: vscode.Webview, environments: string[]) {
        // Use a nonce to only allow specific scripts to be run
        const nonce = getNonce();

        const environmentItems = environments.length > 0 
            ? environments.map((env, index) => `
                <div class="environment-item">
                    <div class="environment-name">
                        <span class="environment-number">${index + 1}.</span>
                        <span class="environment-text">${this._escapeHtml(env)}</span>
                    </div>
                </div>
            `).join('')
            : `
                <div class="no-environments">
                    <p>No environments found</p>
                    <p class="help-text">
                        Make sure you have created some environments first. 
                        You can create environments using the container-use CLI.
                    </p>
                </div>
            `;

        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
                <title>Container Use Environments</title>
                <style>
                    body {
                        font-family: var(--vscode-font-family);
                        font-size: var(--vscode-font-size);
                        font-weight: var(--vscode-font-weight);
                        color: var(--vscode-foreground);
                        background-color: var(--vscode-editor-background);
                        padding: 20px;
                        margin: 0;
                    }
                    
                    .header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 20px;
                        padding-bottom: 15px;
                        border-bottom: 1px solid var(--vscode-panel-border);
                    }
                    
                    .title {
                        font-size: 1.4em;
                        font-weight: bold;
                        color: var(--vscode-titleBar-activeForeground);
                    }
                    
                    .refresh-button {
                        background-color: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        border: none;
                        padding: 8px 16px;
                        border-radius: 3px;
                        cursor: pointer;
                        font-size: 0.9em;
                        transition: background-color 0.2s;
                    }
                    
                    .refresh-button:hover {
                        background-color: var(--vscode-button-hoverBackground);
                    }
                    
                    .environments-container {
                        max-width: 800px;
                    }
                    
                    .environment-item {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 12px 16px;
                        margin-bottom: 8px;
                        background-color: var(--vscode-list-hoverBackground);
                        border: 1px solid var(--vscode-panel-border);
                        border-radius: 5px;
                        transition: background-color 0.2s, border-color 0.2s;
                    }
                    
                    .environment-item:hover {
                        background-color: var(--vscode-list-activeSelectionBackground);
                        border-color: var(--vscode-focusBorder);
                    }
                    
                    .environment-name {
                        display: flex;
                        align-items: center;
                        flex: 1;
                    }
                    
                    .environment-number {
                        color: var(--vscode-descriptionForeground);
                        margin-right: 8px;
                        min-width: 25px;
                        font-family: var(--vscode-editor-font-family);
                    }
                    
                    .environment-text {
                        font-family: var(--vscode-editor-font-family);
                        font-size: 0.95em;
                        word-break: break-all;
                    }
                    
                    .no-environments {
                        text-align: center;
                        padding: 40px 20px;
                        color: var(--vscode-descriptionForeground);
                    }
                    
                    .no-environments p {
                        margin: 10px 0;
                    }
                    
                    .help-text {
                        font-size: 0.9em;
                        color: var(--vscode-descriptionForeground);
                        font-style: italic;
                    }
                    
                    .count-badge {
                        background-color: var(--vscode-badge-background);
                        color: var(--vscode-badge-foreground);
                        padding: 2px 8px;
                        border-radius: 12px;
                        font-size: 0.8em;
                        margin-left: 10px;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div>
                        <span class="title">Container Use Environments</span>
                        ${environments.length > 0 ? `<span class="count-badge">${environments.length}</span>` : ''}
                    </div>
                    <button class="refresh-button" onclick="refresh()">
                        Refresh
                    </button>
                </div>
                
                <div class="environments-container">
                    ${environmentItems}
                </div>

                <script nonce="${nonce}">
                    const vscode = acquireVsCodeApi();
                    
                    function refresh() {
                        vscode.postMessage({
                            command: 'refresh'
                        });
                    }
                </script>
            </body>
            </html>`;
    }

    private _escapeHtml(text: string): string {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
}

function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
