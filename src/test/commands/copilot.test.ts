import { describe, it, beforeEach, afterEach } from 'mocha';
import { strict as assert } from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { registerCopilotCommand } from '../../commands/copilot';

// Test constants
const TEST_WORKSPACE_PATH = '/test/workspace';
const INSTRUCTIONS_FILE_PATH = path.join(TEST_WORKSPACE_PATH, '.github', 'copilot-instructions.md');

describe('Copilot Command', () => {
    let sandbox: sinon.SinonSandbox;
    let mockContext: vscode.ExtensionContext;
    let showInformationMessageStub: sinon.SinonStub;
    let showErrorMessageStub: sinon.SinonStub;
    let showWarningMessageStub: sinon.SinonStub;
    let registerCommandStub: sinon.SinonStub;
    let fsAccessStub: sinon.SinonStub;
    let fsMkdirStub: sinon.SinonStub;
    let fsWriteFileStub: sinon.SinonStub;
    let workspaceFoldersStub: sinon.SinonStub;

    beforeEach(() => {
        sandbox = sinon.createSandbox();

        // Mock VS Code API
        showInformationMessageStub = sandbox.stub(vscode.window, 'showInformationMessage');
        showErrorMessageStub = sandbox.stub(vscode.window, 'showErrorMessage');
        showWarningMessageStub = sandbox.stub(vscode.window, 'showWarningMessage');
        registerCommandStub = sandbox.stub(vscode.commands, 'registerCommand');

        // Mock file system operations
        fsAccessStub = sandbox.stub(fs.promises, 'access');
        fsMkdirStub = sandbox.stub(fs.promises, 'mkdir');
        fsWriteFileStub = sandbox.stub(fs.promises, 'writeFile');

        // Mock workspace
        workspaceFoldersStub = sandbox.stub(vscode.workspace, 'workspaceFolders').value([
            {
                uri: { fsPath: TEST_WORKSPACE_PATH },
                name: 'test-workspace',
                index: 0
            }
        ]);

        // Mock extension context with proper typing
        mockContext = {
            subscriptions: []
        } as unknown as vscode.ExtensionContext;
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe('registerCopilotCommand', () => {
        it('should register the copilot command', () => {
            registerCopilotCommand(mockContext);

            assert.strictEqual(registerCommandStub.calledOnce, true);
            assert.strictEqual(registerCommandStub.firstCall.args[0], 'container-use.addCopilotInstructions');
            assert.strictEqual(typeof registerCommandStub.firstCall.args[1], 'function');
            assert.strictEqual(mockContext.subscriptions.length, 1);
        });

        it('should add command to subscriptions', () => {
            const mockDisposable = { dispose: sandbox.stub() };
            registerCommandStub.returns(mockDisposable);

            registerCopilotCommand(mockContext);

            assert.strictEqual(mockContext.subscriptions.includes(mockDisposable), true);
        });
    });

    describe('addCopilotInstructions command', () => {
        let commandHandler: () => Promise<void>;

        beforeEach(() => {
            registerCopilotCommand(mockContext);
            commandHandler = registerCommandStub.firstCall.args[1];
        });

        describe('when no workspace is open', () => {
            beforeEach(() => {
                workspaceFoldersStub.value(undefined);
            });

            it('should show error message for no workspace', async () => {
                await commandHandler();

                assert.strictEqual(showErrorMessageStub.calledOnce, true);
                assert.strictEqual(
                    showErrorMessageStub.firstCall.args[0],
                    'No workspace folder found. Please open a workspace first.'
                );
            });

            it('should not attempt to create files', async () => {
                await commandHandler();

                assert.strictEqual(fsAccessStub.called, false);
                assert.strictEqual(fsWriteFileStub.called, false);
            });
        });

        describe('when workspace is available', () => {
            describe('file does not exist', () => {
                beforeEach(() => {
                    fsAccessStub.rejects(); // File doesn't exist
                });

                it('should prompt user to add instructions', async () => {
                    showInformationMessageStub.resolves('Add Instructions');

                    await commandHandler();

                    // When file doesn't exist, it goes straight to the information message
                    assert.strictEqual(showInformationMessageStub.called, true);
                    assert.deepStrictEqual(showInformationMessageStub.firstCall.args, [
                        'Would you like to add Container Use instructions to your workspace? This will help GitHub Copilot understand how to use environments properly.',
                        'Add Instructions',
                        'Cancel'
                    ]);
                });

                it('should create instructions file when user confirms', async () => {
                    showInformationMessageStub.resolves('Add Instructions');
                    fsMkdirStub.resolves();
                    fsWriteFileStub.resolves();

                    await commandHandler();

                    assert.strictEqual(fsMkdirStub.calledOnce, true);
                    assert.deepStrictEqual(fsMkdirStub.firstCall.args, [
                        path.dirname(INSTRUCTIONS_FILE_PATH),
                        { recursive: true }
                    ]);
                    
                    assert.strictEqual(fsWriteFileStub.calledOnce, true);
                    assert.strictEqual(fsWriteFileStub.firstCall.args[0], INSTRUCTIONS_FILE_PATH);
                    assert.strictEqual(typeof fsWriteFileStub.firstCall.args[1], 'string');
                    assert.strictEqual(fsWriteFileStub.firstCall.args[2], 'utf8');
                });

                it('should show success message after creating file', async () => {
                    showInformationMessageStub.resolves('Add Instructions');
                    fsMkdirStub.resolves();
                    fsWriteFileStub.resolves();

                    await commandHandler();

                    assert.strictEqual(showInformationMessageStub.calledTwice, true);
                    assert.strictEqual(
                        showInformationMessageStub.secondCall.args[0],
                        'Container Use instructions have been added to your workspace!'
                    );
                });

                it('should not create file when user cancels', async () => {
                    showInformationMessageStub.resolves('Cancel');

                    await commandHandler();

                    assert.strictEqual(fsWriteFileStub.called, false);
                    assert.strictEqual(showInformationMessageStub.calledOnce, true);
                });

                it('should not create file when user dismisses dialog', async () => {
                    showInformationMessageStub.resolves(undefined);

                    await commandHandler();

                    assert.strictEqual(fsWriteFileStub.called, false);
                });
            });

            describe('file already exists', () => {
                beforeEach(() => {
                    fsAccessStub.resolves(); // File exists
                });

                it('should prompt user about overwriting existing file', async () => {
                    showWarningMessageStub.resolves('Keep Existing');

                    await commandHandler();

                    assert.strictEqual(showWarningMessageStub.calledOnce, true);
                    assert.deepStrictEqual(showWarningMessageStub.firstCall.args, [
                        'Instructions file already exists. Would you like to overwrite it?',
                        'Overwrite',
                        'Keep Existing'
                    ]);
                });

                it('should not proceed when user chooses to keep existing', async () => {
                    showWarningMessageStub.resolves('Keep Existing');

                    await commandHandler();

                    assert.strictEqual(showInformationMessageStub.called, false);
                    assert.strictEqual(fsWriteFileStub.called, false);
                });

                it('should proceed to prompt when user chooses to overwrite', async () => {
                    showWarningMessageStub.resolves('Overwrite');
                    showInformationMessageStub.resolves('Add Instructions');
                    fsWriteFileStub.resolves();

                    await commandHandler();

                    // When file exists and user chooses overwrite, warning is shown first, then information
                    assert.strictEqual(showWarningMessageStub.called, true);
                    assert.strictEqual(showInformationMessageStub.called, true);
                    assert.deepStrictEqual(showInformationMessageStub.firstCall.args, [
                        'Would you like to add Container Use instructions to your workspace? This will help GitHub Copilot understand how to use environments properly.',
                        'Add Instructions',
                        'Cancel'
                    ]);
                });

                it('should show overwrite success message', async () => {
                    showWarningMessageStub.resolves('Overwrite');
                    showInformationMessageStub.resolves('Add Instructions');
                    fsWriteFileStub.resolves();

                    await commandHandler();

                    assert.strictEqual(showInformationMessageStub.calledTwice, true);
                    assert.strictEqual(
                        showInformationMessageStub.secondCall.args[0],
                        'Container Use instructions have been updated!'
                    );
                });

                it('should not proceed when user dismisses overwrite dialog', async () => {
                    showWarningMessageStub.resolves(undefined);

                    await commandHandler();

                    assert.strictEqual(showInformationMessageStub.called, false);
                    assert.strictEqual(fsWriteFileStub.called, false);
                });
            });

            describe('directory creation', () => {
                beforeEach(() => {
                    fsAccessStub.onFirstCall().rejects(); // File doesn't exist
                    fsAccessStub.onSecondCall().rejects(); // Directory doesn't exist
                    showInformationMessageStub.resolves('Add Instructions');
                    fsWriteFileStub.resolves();
                });

                it('should create directory when it does not exist', async () => {
                    fsMkdirStub.resolves();

                    await commandHandler();

                    assert.strictEqual(fsMkdirStub.calledOnce, true);
                    assert.deepStrictEqual(fsMkdirStub.firstCall.args, [
                        path.dirname(INSTRUCTIONS_FILE_PATH),
                        { recursive: true }
                    ]);
                });

                it('should not create directory when it already exists', async () => {
                    fsAccessStub.onSecondCall().resolves(); // Directory exists

                    await commandHandler();

                    assert.strictEqual(fsMkdirStub.called, false);
                });
            });

            describe('error handling', () => {
                beforeEach(() => {
                    fsAccessStub.rejects(); // File doesn't exist
                    showInformationMessageStub.resolves('Add Instructions');
                });

                it('should handle file system write errors', async () => {
                    const error = new Error('Permission denied');
                    fsWriteFileStub.rejects(error);

                    await commandHandler();

                    assert.strictEqual(showErrorMessageStub.calledOnce, true);
                    assert.strictEqual(
                        showErrorMessageStub.firstCall.args[0],
                        `Failed to create instructions file: ${error}`
                    );
                });

                it('should handle directory creation errors', async () => {
                    const error = new Error('Cannot create directory');
                    fsAccessStub.onSecondCall().rejects(); // Directory doesn't exist
                    fsMkdirStub.rejects(error);

                    await commandHandler();

                    assert.strictEqual(showErrorMessageStub.calledOnce, true);
                    assert.strictEqual(
                        showErrorMessageStub.firstCall.args[0],
                        `Failed to create instructions file: ${error}`
                    );
                });
            });

            describe('instructions content', () => {
                beforeEach(() => {
                    fsAccessStub.rejects(); // File doesn't exist
                    showInformationMessageStub.resolves('Add Instructions');
                    fsMkdirStub.resolves();
                    fsWriteFileStub.resolves();
                });

                it('should write correct instructions content', async () => {
                    await commandHandler();

                    const expectedContent = fsWriteFileStub.firstCall.args[1];
                    assert.strictEqual(typeof expectedContent, 'string');
                    assert.strictEqual(expectedContent.includes('ALWAYS use ONLY Environments for ANY and ALL file, code, or shell operations—NO EXCEPTIONS—even for simple or generic requests'), true);
                });

                it('should write file with UTF-8 encoding', async () => {
                    await commandHandler();

                    assert.strictEqual(fsWriteFileStub.calledOnce, true);
                    assert.strictEqual(fsWriteFileStub.firstCall.args[0], INSTRUCTIONS_FILE_PATH);
                    assert.strictEqual(typeof fsWriteFileStub.firstCall.args[1], 'string');
                    assert.strictEqual(fsWriteFileStub.firstCall.args[2], 'utf8');
                });

                it('should write file to correct path', async () => {
                    await commandHandler();

                    assert.strictEqual(fsWriteFileStub.calledOnce, true);
                    assert.strictEqual(fsWriteFileStub.firstCall.args[0], INSTRUCTIONS_FILE_PATH);
                    assert.strictEqual(typeof fsWriteFileStub.firstCall.args[1], 'string');
                    assert.strictEqual(fsWriteFileStub.firstCall.args[2], 'utf8');
                });
            });
        });
    });
});
