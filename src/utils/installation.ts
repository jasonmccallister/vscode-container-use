import { exec } from 'child_process';
import { promisify } from 'util';
import * as os from 'os';

const execAsync = promisify(exec);

export interface InstallResult {
    isInstalled: boolean;
    hasCorrectBinary: boolean;
    hasHomebrew?: boolean;
    platform: string;
}

export const checkInstallation = async (): Promise<InstallResult> => {
    const platform = os.platform();
    
    // Check if cu binary exists and has the correct output
    let hasCorrectBinary = false;
    try {
        const { stdout } = await execAsync('cu -h');
        hasCorrectBinary = stdout.includes('stdio');
    } catch (error) {
        // cu binary doesn't exist or failed to execute
        hasCorrectBinary = false;
    }

    // Check if Homebrew is installed (for macOS/Linux)
    let hasHomebrew: boolean | undefined;
    if (platform === 'darwin' || platform === 'linux') {
        try {
            await execAsync('brew --version');
            hasHomebrew = true;
        } catch (error) {
            hasHomebrew = false;
        }
    }

    return {
        isInstalled: hasCorrectBinary,
        hasCorrectBinary,
        hasHomebrew,
        platform
    };
};
