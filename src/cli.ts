import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

export interface CommandResult {
    stdout: string;
    stderr: string;
    exitCode: number;
}

const execAsync = promisify(exec);

export default class ContainerUseCli {
    private readonly workspace?: vscode.Uri;
    private readonly command: string;

    /**
     * Creates a new ContainerUseCli instance
     * @param command Path to the container use executable (e.g., 'cu' or '/usr/local/bin/cu')
     * @param workspace VS Code workspace folder to execute commands in
     */
    constructor(
        command: string,
        workspace?: vscode.Uri,
    ) {
        if (!command || command.trim().length === 0) {
            throw new Error('Command path cannot be empty');
        }

        this.command = command.trim();
        this.workspace = workspace;
    }

    /**
     * Runs the container use command with the specified arguments and options
     * @param args Arguments to pass to the command
     * @param options Options for running the command, such as timeout and working directory
     * @returns A Promise that resolves to a CommandResult containing stdout, stderr, and exit code
     * @throws Error if the command fails to execute or the working directory does not exist
     */
    public async run(
        args: string[] = [],
        options: { timeout?: number; cwd?: string } = {}
    ): Promise<CommandResult> {
        const workingDirectory = options.cwd || this.workspace?.fsPath;
        const timeout = options.timeout || 30000;

        if (!workingDirectory || !fs.existsSync(workingDirectory)) {
            throw new Error(`Working directory does not exist: ${workingDirectory}`);
        }

        const command = `${this.command} ${args.join(' ')}`;

        try {
            const { stdout, stderr } = await execAsync(command, {
                cwd: workingDirectory,
                timeout,
                env: process.env
            });

            return {
                stdout: stdout.trim(),
                stderr: stderr.trim(),
                exitCode: 0
            };
        } catch (error: any) {
            return {
                stdout: error.stdout?.trim() || '',
                stderr: error.stderr?.trim() || error.message || 'Unknown error',
                exitCode: error.code || 1
            };
        }
    }

    /**
     * Validates if the container use command is available in the system
     * @returns A Promise that resolves to true if the command is available, false otherwise
     */
    public async isInstalled(): Promise<boolean> {
        try {
            const result = await this.run(['--help']);
            // make sure the result output contains the string stdio
            if (result.stderr && result.stderr.includes('stdio')) {
                return true;
            }

            return result.exitCode === 0;
        } catch (error) {
            return false;
        }
    }

    /**
     * Checks if the current workspace is a Git repository
     * @returns A Promise that resolves to true if the workspace is a Git repository, false otherwise
     */
    public async isGitDirectory(): Promise<boolean> {
        if (!this.workspace) {
            return false;
        }
        const gitDir = path.join(this.workspace.fsPath, '.git');
        try {
            const stats = await fs.promises.stat(gitDir);
            return stats.isDirectory();
        } catch (error) {
            return false; // If .git directory does not exist, return false
        }
    }
}

