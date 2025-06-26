import * as vscode from 'vscode';
import { createCliInstance } from '../utils/environment';
import type ContainerUseCli from '../cli/cli';

const COMMANDS = {
    UPDATE: 'container-use.update'
} as const;

const MESSAGES = {
    UPDATE_CHECK_TITLE: 'Container Use Update Check',
    UPDATE_CHECK_IN_PROGRESS: 'Checking for Container Use updates...',
    UPDATE_CHECK_FAILED: 'Failed to check for updates',
    UPDATE_AVAILABLE: 'Container Use update available',
    UPDATE_NOT_AVAILABLE: 'Container Use is up to date',
    UPDATE_PROMPT: 'A new version of Container Use is available. Would you like to update now?',
    UPDATE_ACTION: 'Update Now',
    CANCEL_ACTION: 'Cancel',
    UPDATE_IN_PROGRESS: 'Updating Container Use...',
    UPDATE_SUCCESS: 'Container Use updated successfully',
    UPDATE_FAILED: 'Failed to update Container Use',
    UNSUPPORTED_METHOD: 'Unsupported installation method'
} as const;

const GITHUB_API = {
    RELEASES_URL: 'https://api.github.com/repos/dagger/dagger/releases/latest'
} as const;

interface UpdateCommandConfig {
    workspacePath?: string;
    cli?: ContainerUseCli;
}

interface GitHubRelease {
    tag_name: string;
    name: string;
    html_url: string;
}

/**
 * Compares two version strings (e.g., "v0.15.0" vs "v0.14.1")
 * Returns true if newVersion is greater than currentVersion
 */
const isNewerVersion = (currentVersion: string, newVersion: string): boolean => {
    const cleanCurrent = currentVersion.replace(/^v/, '');
    const cleanNew = newVersion.replace(/^v/, '');

    const currentParts = cleanCurrent.split('.').map(Number);
    const newParts = cleanNew.split('.').map(Number);

    for (let i = 0; i < Math.max(currentParts.length, newParts.length); i++) {
        const current = currentParts[i] || 0;
        const newPart = newParts[i] || 0;

        if (newPart > current) {
            return true;
        }
        if (newPart < current) {
            return false;
        }
    }

    return false;
};

/**
 * Gets the latest version from GitHub releases API
 */
const getLatestVersionFromGitHub = async (): Promise<string | null> => {
    try {
        const response = await fetch(GITHUB_API.RELEASES_URL);
        if (!response.ok) {
            throw new Error(`GitHub API request failed: ${response.status}`);
        }

        const release = await response.json() as GitHubRelease;
        return release.tag_name;
    } catch (error) {
        console.error('[Container Use] Failed to get latest version from GitHub:', error);
        return null;
    }
};

/**
 * Gets the current Container Use version
 */
const getCurrentVersion = async (cli: ContainerUseCli): Promise<string | null> => {
    try {
        const result = await cli.run(['version']);
        if (result.success && result.stdout) {
            // Extract version from output (e.g., "dagger v0.15.0")
            const versionMatch = result.stdout.match(/v?\d+\.\d+\.\d+/);
            return versionMatch ? versionMatch[0] : null;
        }
        return null;
    } catch (error) {
        console.error('[Container Use] Failed to get current version:', error);
        return null;
    }
};

/**
 * Checks for updates using Homebrew
 */
const checkBrewUpdate = async (): Promise<{ hasUpdate: boolean; currentVersion?: string; latestVersion?: string }> => {
    try {
        // Check if there are any outdated packages including dagger
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);

        const { stdout } = await execAsync('brew outdated dagger/tap/container-use');

        if (stdout.trim()) {
            // Parse the output to get versions
            const lines = stdout.trim().split('\n');
            for (const line of lines) {
                if (line.includes('dagger/tap/container-use')) {
                    const parts = line.split(/\s+/);
                    const currentVersion = parts[1];
                    const latestVersion = parts[2] || parts[1];
                    return { hasUpdate: true, currentVersion, latestVersion };
                }
            }
        }

        return { hasUpdate: false };
    } catch (error) {
        // If command fails, dagger is likely up to date or not installed via brew
        return { hasUpdate: false };
    }
};

/**
 * Checks for updates using GitHub API (for curl installations)
 */
const checkGitHubUpdate = async (cli: ContainerUseCli): Promise<{ hasUpdate: boolean; currentVersion?: string; latestVersion?: string }> => {
    const currentVersion = await getCurrentVersion(cli);
    const latestVersion = await getLatestVersionFromGitHub();

    if (!currentVersion || !latestVersion) {
        return { hasUpdate: false };
    }

    const hasUpdate = isNewerVersion(currentVersion, latestVersion);
    return { hasUpdate, currentVersion, latestVersion };
};

/**
 * Gets the installation method from VS Code settings
 */
const getInstallationMethod = (): 'brew' | 'curl' => {
    const config = vscode.workspace.getConfiguration('containerUse');
    return config.get<'brew' | 'curl'>('installMethod', 'curl');
};

/**
 * Performs the update based on installation method
 */
const performUpdate = async (method: 'brew' | 'curl'): Promise<boolean> => {
    try {
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);

        if (method === 'brew') {
            await execAsync('brew upgrade dagger/tap/container-use');
            return true;
        } else {
            // For curl method, provide instructions since it's more complex
            const updateUrl = 'https://docs.dagger.io/install';
            const action = await vscode.window.showInformationMessage(
                'For curl installations, please visit the installation page to update manually.',
                'Open Installation Guide',
                'Cancel'
            );

            if (action === 'Open Installation Guide') {
                vscode.env.openExternal(vscode.Uri.parse(updateUrl));
            }
            return false; // Don't show success message for manual update
        }
    } catch (error) {
        console.error('[Container Use] Update failed:', error);
        return false;
    }
};

/**
 * Checks for Container Use updates and prompts user to update if available
 */
const checkForUpdates = async (cli: ContainerUseCli): Promise<void> => {
    console.log('[Container Use] Checking for updates');

    await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: MESSAGES.UPDATE_CHECK_IN_PROGRESS,
            cancellable: false
        },
        async (progress) => {
            try {
                const installMethod = getInstallationMethod();
                let updateInfo: { hasUpdate: boolean; currentVersion?: string; latestVersion?: string };

                if (installMethod === 'brew') {
                    updateInfo = await checkBrewUpdate();
                } else {
                    updateInfo = await checkGitHubUpdate(cli);
                }

                if (updateInfo.hasUpdate) {
                    const versionText = updateInfo.currentVersion && updateInfo.latestVersion
                        ? ` (${updateInfo.currentVersion} → ${updateInfo.latestVersion})`
                        : '';

                    const action = await vscode.window.showInformationMessage(
                        `${MESSAGES.UPDATE_PROMPT}${versionText}`,
                        { modal: true },
                        MESSAGES.UPDATE_ACTION,
                        MESSAGES.CANCEL_ACTION
                    );

                    if (action === MESSAGES.UPDATE_ACTION) {
                        await vscode.window.withProgress(
                            {
                                location: vscode.ProgressLocation.Notification,
                                title: MESSAGES.UPDATE_IN_PROGRESS,
                                cancellable: false
                            },
                            async () => {
                                const success = await performUpdate(installMethod);
                                if (success) {
                                    vscode.window.showInformationMessage(MESSAGES.UPDATE_SUCCESS);
                                }
                            }
                        );
                    }
                } else {
                    const versionText = updateInfo.currentVersion ? ` (${updateInfo.currentVersion})` : '';
                    vscode.window.showInformationMessage(`${MESSAGES.UPDATE_NOT_AVAILABLE}${versionText}`);
                }
            } catch (error) {
                console.error(`[Container Use] ${MESSAGES.UPDATE_CHECK_FAILED}`, error);
                vscode.window.showErrorMessage(`${MESSAGES.UPDATE_CHECK_FAILED}: ${error}`);
            }
        }
    );
};

/**
 * Handles the update command
 * Checks for updates and prompts user to update if available
 */
const handleUpdateCommand = async (config: UpdateCommandConfig = {}): Promise<void> => {
    const { workspacePath, cli } = config;

    const containerUseCli = cli || createCliInstance(workspacePath);
    await checkForUpdates(containerUseCli);
};

/**
 * Registers the update command
 */
export const registerUpdateCommand = (context: vscode.ExtensionContext, config: UpdateCommandConfig = {}): void => {
    const updateCommand = vscode.commands.registerCommand(
        COMMANDS.UPDATE,
        () => handleUpdateCommand(config)
    );

    context.subscriptions.push(updateCommand);
};
