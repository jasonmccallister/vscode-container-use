import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

// Constants to eliminate magic strings and numbers
const CLI_CONFIG = {
    COMMAND: 'cu',
    DEFAULT_TIMEOUT: 30000,
    GIT_DIRECTORY: '.git',
    VALIDATION_TEXT: 'stdio'
} as const;

const CLI_COMMANDS = {
    LIST: 'list',
    HELP: '--help'
} as const;

const CLI_HEADERS = {
    LIST_HEADER: 'ID  TITLE  CREATED  UPDATED'
} as const;

const MESSAGES = {
    NO_ENVIRONMENTS: 'No environments found.',
    ENVIRONMENTS_NOT_FOUND: 'No environments found or command failed.',
    FAILED_TO_GET_ENVIRONMENTS: 'Failed to get environments'
} as const;

const EXIT_CODES = {
    SUCCESS: 0,
    ERROR: 1
} as const;

export interface CommandResult {
    stdout: string;
    stderr: string;
    exitCode: number;
    success?: boolean;
}

export interface Environment {
    id: string;
    name: string;
    title: string;
    created?: string;
    updated?: string;
}

interface CliConfig {
    command?: string;
    workspacePath?: string;
}

interface RunOptions {
    timeout?: number;
    cwd?: string;
}

const execAsync = promisify(exec);

export default class ContainerUseCli {
    private readonly command: string;
    private workspacePath?: string;

    constructor({ command = CLI_CONFIG.COMMAND, workspacePath }: CliConfig = {}) {
        this.command = command;
        this.workspacePath = workspacePath;
    }

    /**
     * Runs the container use command with the specified arguments and options
     * @param args Arguments to pass to the command
     * @param options Options for running the command, such as timeout and working directory
     * @returns A Promise that resolves to a CommandResult containing stdout, stderr, and exit code
     * @throws Error if the command fails to execute or the working directory does not exist
     */
    run = async (
        args: string[] = [],
        options: RunOptions = {}
    ): Promise<CommandResult> => {
        const { timeout = CLI_CONFIG.DEFAULT_TIMEOUT, cwd } = options;
        const command = `${this.command} ${args.join(' ')}`;
        const workingDirectory = cwd || this.workspacePath || process.cwd();

        try {
            const { stdout, stderr } = await execAsync(command, {
                cwd: workingDirectory,
                timeout,
                env: process.env
            });

            return {
                stdout: stdout.trim(),
                stderr: stderr.trim(),
                exitCode: EXIT_CODES.SUCCESS,
                success: true
            };
        } catch (error: any) {
            return {
                stdout: error.stdout?.trim() || '',
                stderr: error.stderr?.trim() || error.message || 'Unknown error',
                exitCode: error.code || EXIT_CODES.ERROR,
                success: false
            };
        }
    };

    /**
     * Parses a line from cu list output into an Environment object
     * @param line The line to parse (format: "ID  TITLE  CREATED  UPDATED")
     * @returns Environment object or null if line is invalid
     */
    private parseEnvironmentLine = (line: string): Environment | null => {
        const trimmed = line.trim();
        if (!trimmed) {
            return null;
        }

        // Split by multiple spaces to handle the tabular format
        const parts = trimmed.split(/\s{2,}/).map(part => part.trim());
        
        if (parts.length < 2) {
            return null;
        }

        const [id, title, created, updated] = parts;
        
        return {
            id: id || '',
            name: title || id, // Use title as name, fallback to id
            title: title || id,
            created,
            updated
        };
    };

    /**
     * Filters and parses environment lines, excluding headers
     * @param lines Array of lines from cu list output
     * @returns Array of parsed Environment objects
     */
    private parseEnvironmentLines = (lines: string[]): Environment[] => {
        return lines
            .filter(line => {
                const trimmed = line.trim();
                // Filter out empty lines and header lines
                if (trimmed === '') {
                    return false;
                }
                
                // Check if this is a header line (starts with ID and contains standard header keywords)
                if (trimmed.startsWith('ID') && 
                    (trimmed.includes('TITLE') || trimmed.includes('CREATED') || trimmed.includes('UPDATED'))) {
                    return false;
                }
                
                return true;
            })
            .map(this.parseEnvironmentLine)
            .filter((env): env is Environment => env !== null);
    };

    /**
     * Gets a list of available environments
     * @returns A Promise that resolves to an array of Environment objects containing the names of available environments
     * @throws Error if the command fails to execute or no environments are found
     */
    environments = async (): Promise<Environment[]> => {
        const result = await this.run([CLI_COMMANDS.LIST]);

        if (!result.success || result.exitCode !== EXIT_CODES.SUCCESS) {
            console.error(MESSAGES.FAILED_TO_GET_ENVIRONMENTS, result.stderr);
            return [];
        }

        if (!result.stdout) {
            console.warn(MESSAGES.ENVIRONMENTS_NOT_FOUND);
            return [];
        }

        const lines = result.stdout.split('\n');
        const environments = this.parseEnvironmentLines(lines);

        if (environments.length === 0) {
            console.warn(MESSAGES.NO_ENVIRONMENTS);
            return [];
        }

        return environments;
    };

    /**
     * Lists environment names as raw output from cu list command
     * @returns A Promise that resolves to a string containing environment names separated by newlines
     */
    listEnvironments = async (): Promise<string> => {
        const result = await this.run([CLI_COMMANDS.LIST]);

        if (!result.success || result.exitCode !== EXIT_CODES.SUCCESS) {
            return '';
        }

        return result.stdout || '';
    };

    /**
     * Gets environment names as an array of strings
     * @returns A Promise that resolves to an array of environment name strings
     */
    getEnvironmentNames = async (): Promise<string[]> => {
        const environments = await this.environments();
        return environments.map(env => env.name);
    };

    /**
     * Validates if the container use command is available in the system
     * @returns A Promise that resolves to true if the command is available, false otherwise
     */
    isInstalled = async (): Promise<boolean> => {
        const result = await this.run([CLI_COMMANDS.HELP]);
        return result.stdout !== '' && result.stdout.includes(CLI_CONFIG.VALIDATION_TEXT);
    };

    /**
     * Checks if the current workspace is a Git repository
     * @returns A Promise that resolves to true if the workspace is a Git repository, false otherwise
     */
    isGitDirectory = async (): Promise<boolean> => {
        try {
            const gitPath = path.join(process.cwd(), CLI_CONFIG.GIT_DIRECTORY);
            const stats = await fs.promises.stat(gitPath);
            return stats.isDirectory();
        } catch (error) {
            return false; // If .git directory does not exist, return false
        }
    };

    /**
     * Sets the workspace path for the CLI commands
     * @param workspacePath The path to the workspace directory
     * @throws Error if the workspace path is invalid or does not exist
     */
    setWorkspacePath = (workspacePath: string): void => {
        if (!workspacePath || !fs.existsSync(workspacePath)) {
            throw new Error(`Invalid workspace path: ${workspacePath}`);
        }

        this.workspacePath = workspacePath;
    };
}

// Factory function for dependency injection
export const createContainerUseCli = (config: CliConfig = {}): ContainerUseCli => {
    return new ContainerUseCli(config);
};

