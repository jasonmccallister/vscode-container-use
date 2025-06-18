import { spawn } from 'child_process';

/**
 * Result type for CLI command execution
 */
export interface CliResult<T = string> {
    success: boolean;
    data?: T;
    error?: string;
    stdout?: string;
    stderr?: string;
}

/**
 * Base CLI class for executing container-use commands
 */
export class ContainerUseCli {
    private workspacePath: string;
    private timeout: number;

    constructor(workspacePath: string, timeout: number = 10000) {
        this.workspacePath = workspacePath;
        this.timeout = timeout;
    }

    /**
     * Execute a cu command with the given arguments
     */
    private async executeCommand(args: string[]): Promise<CliResult> {
        return new Promise((resolve) => {
            try {
                const process = spawn('cu', args, {
                    stdio: ['ignore', 'pipe', 'pipe'],
                    cwd: this.workspacePath
                });

                let stdout = '';
                let stderr = '';

                process.stdout?.on('data', (data) => {
                    stdout += data.toString();
                });

                process.stderr?.on('data', (data) => {
                    stderr += data.toString();
                });

                process.on('close', (code) => {
                    if (code === 0) {
                        resolve({
                            success: true,
                            data: stdout,
                            stdout,
                            stderr
                        });
                    } else {
                        const errorMessage = stderr || `Command failed with exit code ${code}`;
                        resolve({
                            success: false,
                            error: errorMessage,
                            stdout,
                            stderr
                        });
                    }
                });

                process.on('error', (error) => {
                    resolve({
                        success: false,
                        error: error.message,
                        stdout,
                        stderr
                    });
                });

                // Set a timeout to avoid hanging
                setTimeout(() => {
                    process.kill();
                    resolve({
                        success: false,
                        error: `Command timed out after ${this.timeout / 1000} seconds`,
                        stdout,
                        stderr
                    });
                }, this.timeout);

            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                resolve({
                    success: false,
                    error: errorMessage
                });
            }
        });
    }

    /**
     * Get list of environments
     */
    async list(): Promise<CliResult<string[]>> {
        console.log('Executing cu list command...');
        const result = await this.executeCommand(['list']);

        if (!result.success) {
            return {
                success: false,
                error: result.error,
                stdout: result.stdout,
                stderr: result.stderr
            };
        }

        console.log('cu list raw output:', JSON.stringify(result.stdout));

        // Parse the output to extract environment names
        const lines = result.stdout!.split('\n');
        const environments: string[] = [];

        for (const line of lines) {
            const trimmedLine = line.trim();

            // Skip empty lines
            if (!trimmedLine) {
                continue;
            }

            // For the format "go-api-request-info/growing-squirrel", we want the whole line
            // Split by whitespace and take the first part (environment name)
            const parts = trimmedLine.split(/\s+/);
            const envName = parts[0];

            // Make sure it's a valid environment name
            if (envName && envName.length > 0) {
                environments.push(envName);
            }
        }

        console.log('Parsed environments:', environments);

        return {
            success: true,
            data: environments,
            stdout: result.stdout,
            stderr: result.stderr
        };
    }

    /**
     * Merge an environment
     */
    async merge(environment: string): Promise<CliResult> {
        console.log(`Executing cu merge ${environment}...`);
        return await this.executeCommand(['merge', environment]);
    }

    /**
     * Delete an environment
     */
    async delete(environment: string): Promise<CliResult> {
        console.log(`Executing cu delete ${environment}...`);
        return await this.executeCommand(['delete', environment]);
    }

    /**
     * Watch for changes
     */
    async watch(): Promise<CliResult> {
        console.log('Executing cu watch...');
        return await this.executeCommand(['watch']);
    }
}
