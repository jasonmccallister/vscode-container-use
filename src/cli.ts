import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

export interface CommandResult {
    stdout: string;
    stderr: string;
    exitCode: number;
    success?: boolean;
}

const execAsync = promisify(exec);

type Environment = {
    name: string;
    description?: string;
}

export default class ContainerUseCli {
    private command: string = 'cu';
    private workspacePath?: string;

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
        const timeout = options.timeout || 30000;

        const command = `${this.command} ${args.join(' ')}`;

        try {
            const { stdout, stderr } = await execAsync(command, {
                cwd: options.cwd || this.workspacePath || process.cwd(),
                timeout,
                env: process.env
            });

            return {
                stdout: stdout.trim(),
                stderr: stderr.trim(),
                exitCode: 0,
                success: true
            };
        } catch (error: any) {
            return {
                stdout: error.stdout?.trim() || '',
                stderr: error.stderr?.trim() || error.message || 'Unknown error',
                exitCode: error.code || 1,
                success: false
            };
        }
    }

    /**
     * Gets a list of available environments
     * @returns A Promise that resolves to an array of Environment objects containing the names of available environments
     * @throws Error if the command fails to execute or no environments are found
     */
    public async environments(): Promise<Environment[]> {
        const result = await this.run(['list']);

        if (!result.success || result.exitCode !== 0) {
            vscode.window.showErrorMessage(`Failed to get environments: ${result.stderr}`);
            return [];
        }

        // break each line of the output into an array
        if (!result.stdout) {
            vscode.window.showErrorMessage('No environments found or command failed.');
            return [];
        }

        const environments = result.stdout.split('\n').filter(line => line.trim() !== '');
        if (environments.length === 0) {
            vscode.window.showInformationMessage('No environments found.');
            return [];
        }

        return environments.map(env => {
            return { name: env };
        });
    }

    /**
     * Validates if the container use command is available in the system
     * @returns A Promise that resolves to true if the command is available, false otherwise
     */
    public async isInstalled(): Promise<boolean> {
        const result = await this.run(['--help']);
        // make sure the result output contains the string stdio
        if (result.stdout !== '' && result.stdout.includes('stdio')) {
            return true;
        }

        return false;
    }

    /**
     * Checks if the current workspace is a Git repository
     * @returns A Promise that resolves to true if the workspace is a Git repository, false otherwise
     */
    public async isGitDirectory(): Promise<boolean> {
        try {
            const stats = await fs.promises.stat(path.join(process.cwd(), '.git'));
            return stats.isDirectory();
        } catch (error) {
            return false; // If .git directory does not exist, return false
        }
    }

    /*
    * Sets the workspace path for the CLI commands
    * @param workspacePath The path to the workspace directory
    * @throws Error if the workspace path is invalid or does not exist
    */
    public setWorkspacePath(workspacePath: string) {
        if (!workspacePath || !fs.existsSync(workspacePath)) {
            throw new Error(`Invalid workspace path: ${workspacePath}`);
        }

        this.workspacePath = workspacePath;
    }
}

