import * as vscode from 'vscode';
import { spawn } from 'child_process';

/**
 * Utility functions for file and directory operations in VS Code workspace
 */

/**
 * Checks if a binary exists in the system by running it with -h flag
 * and verifying the output contains "stdio" with exit code 0
 * @param binaryName The name of the binary to check
 * @returns A promise that resolves to true if the binary exists and meets criteria, false otherwise
 */
export async function ensureBinaryExists(binaryName: string): Promise<boolean> {
    return new Promise((resolve) => {
        try {
            const process = spawn(binaryName, ['-h'], {
                stdio: ['ignore', 'pipe', 'pipe']
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
                // Check if exit code is 0 and output contains "stdio"
                const output = stdout + stderr;
                const hasStdio = output.toLowerCase().includes('stdio');
                const exitCodeOk = code === 0;
                
                resolve(exitCodeOk && hasStdio);
            });

            process.on('error', (error) => {
                console.error(`Error checking for binary ${binaryName}:`, error);
                resolve(false);
            });

            // Set a timeout to avoid hanging
            setTimeout(() => {
                process.kill();
                resolve(false);
            }, 5000); // 5 second timeout

        } catch (error) {
            console.error(`Error checking for binary ${binaryName}:`, error);
            resolve(false);
        }
    });
}