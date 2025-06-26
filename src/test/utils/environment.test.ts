import { describe, it, beforeEach, afterEach } from 'mocha';
import { strict as assert } from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { showEnvironmentQuickPick, createCliInstance } from '../../utils/environment';
import { Environment } from '../../cli/cli';
import type ContainerUseCli from '../../cli/cli';

// Test constants following TypeScript best practices
const TEST_WORKSPACE_PATH = '/test/workspace';

const MOCK_ENVIRONMENTS: Environment[] = [
    {
        id: 'env-1',
        name: 'Environment 1',
        title: 'Test Environment 1',
        created: '2024-01-01T10:00:00Z',
        updated: '2024-01-01T11:00:00Z'
    },
    {
        id: 'env-2',
        name: 'Environment 2',
        title: 'Test Environment 2',
        created: '2024-01-02T10:00:00Z',
        updated: '2024-01-02T11:00:00Z'
    },
    {
        id: 'env-3',
        name: 'Environment 3',
        title: 'Test Environment 3',
        // Missing created/updated to test undefined cases
    }
];

const QUICK_PICK_OPTIONS = {
    placeHolder: 'Select an environment',
    noEnvironmentsMessage: 'Custom no environments message',
    failedToLoadMessage: 'Custom failed to load message'
};

describe('Environment Utilities', () => {
    let sandbox: sinon.SinonSandbox;
    let mockCli: sinon.SinonStubbedInstance<ContainerUseCli>;
    let showQuickPickStub: sinon.SinonStub;
    let showInformationMessageStub: sinon.SinonStub;
    let showErrorMessageStub: sinon.SinonStub;
    let workspaceFoldersStub: sinon.SinonStub;
    let createContainerUseCliStub: sinon.SinonStub;

    beforeEach(() => {
        sandbox = sinon.createSandbox();

        // Create mock CLI with proper typing
        mockCli = {
            environments: sandbox.stub(),
            run: sandbox.stub(),
            isInstalled: sandbox.stub()
        } as unknown as sinon.SinonStubbedInstance<ContainerUseCli>;

        // Mock VS Code API methods
        showQuickPickStub = sandbox.stub(vscode.window, 'showQuickPick');
        showInformationMessageStub = sandbox.stub(vscode.window, 'showInformationMessage');
        showErrorMessageStub = sandbox.stub(vscode.window, 'showErrorMessage');

        // Mock workspace
        workspaceFoldersStub = sandbox.stub(vscode.workspace, 'workspaceFolders').value([
            {
                uri: { fsPath: TEST_WORKSPACE_PATH },
                name: 'test-workspace',
                index: 0
            }
        ]);

        // Mock CLI creation
        createContainerUseCliStub = sandbox.stub(require('../../cli/cli'), 'createContainerUseCli');
        createContainerUseCliStub.returns(mockCli);
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe('showEnvironmentQuickPick', () => {
        describe('successful environment loading', () => {
            beforeEach(() => {
                mockCli.environments.resolves(MOCK_ENVIRONMENTS);
            });

            it('should show quick pick with all environments', async () => {
                const mockSelection = {
                    label: 'env-1',
                    description: 'Test Environment 1',
                    detail: 'Created: 2024-01-01T10:00:00Z',
                    environment: MOCK_ENVIRONMENTS[0]
                };
                showQuickPickStub.resolves(mockSelection);

                const result = await showEnvironmentQuickPick(mockCli, QUICK_PICK_OPTIONS);

                assert.strictEqual(showQuickPickStub.calledOnce, true);
                
                // Verify quick pick items structure
                const quickPickItems = showQuickPickStub.firstCall.args[0];
                assert.strictEqual(Array.isArray(quickPickItems), true);
                assert.strictEqual(quickPickItems.length, 3);
                
                // Check first environment mapping
                assert.strictEqual(quickPickItems[0].label, 'env-1');
                assert.strictEqual(quickPickItems[0].description, 'Test Environment 1');
                assert.strictEqual(quickPickItems[0].detail, 'Created: 2024-01-01T10:00:00Z');
                assert.deepStrictEqual(quickPickItems[0].environment, MOCK_ENVIRONMENTS[0]);
                
                // Check environment without created date
                assert.strictEqual(quickPickItems[2].label, 'env-3');
                assert.strictEqual(quickPickItems[2].description, 'Test Environment 3');
                assert.strictEqual(quickPickItems[2].detail, undefined);
                
                // Verify quick pick options
                const quickPickOptions = showQuickPickStub.firstCall.args[1];
                assert.strictEqual(quickPickOptions.placeHolder, QUICK_PICK_OPTIONS.placeHolder);
                assert.strictEqual(quickPickOptions.matchOnDescription, true);
                assert.strictEqual(quickPickOptions.matchOnDetail, true);
                
                // Verify returned environment
                assert.deepStrictEqual(result, MOCK_ENVIRONMENTS[0]);
            });

            it('should return undefined when user cancels selection', async () => {
                showQuickPickStub.resolves(undefined);

                const result = await showEnvironmentQuickPick(mockCli, QUICK_PICK_OPTIONS);

                assert.strictEqual(showQuickPickStub.calledOnce, true);
                assert.strictEqual(result, undefined);
            });

            it('should use default messages when not provided', async () => {
                const optionsWithoutMessages = {
                    placeHolder: 'Select environment'
                };
                
                const mockSelection = {
                    label: 'env-1',
                    environment: MOCK_ENVIRONMENTS[0]
                };
                showQuickPickStub.resolves(mockSelection);

                const result = await showEnvironmentQuickPick(mockCli, optionsWithoutMessages);

                assert.deepStrictEqual(result, MOCK_ENVIRONMENTS[0]);
            });

            it('should handle environments with all optional fields', async () => {
                const environmentWithAllFields: Environment = {
                    id: 'complete-env',
                    name: 'Complete Environment',
                    title: 'Complete Test Environment',
                    created: '2024-01-03T10:00:00Z',
                    updated: '2024-01-03T12:00:00Z'
                };

                mockCli.environments.resolves([environmentWithAllFields]);
                
                const mockSelection = {
                    label: 'complete-env',
                    environment: environmentWithAllFields
                };
                showQuickPickStub.resolves(mockSelection);

                const result = await showEnvironmentQuickPick(mockCli, QUICK_PICK_OPTIONS);

                const quickPickItems = showQuickPickStub.firstCall.args[0];
                assert.strictEqual(quickPickItems[0].detail, 'Created: 2024-01-03T10:00:00Z');
                assert.deepStrictEqual(result, environmentWithAllFields);
            });
        });

        describe('empty environment list', () => {
            beforeEach(() => {
                mockCli.environments.resolves([]);
            });

            it('should show information message and return undefined for empty environments', async () => {
                const result = await showEnvironmentQuickPick(mockCli, QUICK_PICK_OPTIONS);

                assert.strictEqual(mockCli.environments.calledOnce, true);
                assert.strictEqual(showInformationMessageStub.calledOnce, true);
                assert.strictEqual(
                    showInformationMessageStub.firstCall.args[0],
                    QUICK_PICK_OPTIONS.noEnvironmentsMessage
                );
                assert.strictEqual(showQuickPickStub.called, false);
                assert.strictEqual(result, undefined);
            });

            it('should use default no environments message when not provided', async () => {
                const optionsWithoutMessage = {
                    placeHolder: 'Select environment'
                };

                const result = await showEnvironmentQuickPick(mockCli, optionsWithoutMessage);

                assert.strictEqual(showInformationMessageStub.calledOnce, true);
                assert.strictEqual(
                    showInformationMessageStub.firstCall.args[0],
                    'No environments available.'
                );
                assert.strictEqual(result, undefined);
            });
        });

        describe('error handling', () => {
            it('should handle CLI errors gracefully', async () => {
                const testError = new Error('CLI command failed');
                mockCli.environments.rejects(testError);

                const result = await showEnvironmentQuickPick(mockCli, QUICK_PICK_OPTIONS);

                assert.strictEqual(mockCli.environments.calledOnce, true);
                assert.strictEqual(showErrorMessageStub.calledOnce, true);
                assert.strictEqual(
                    showErrorMessageStub.firstCall.args[0],
                    `${QUICK_PICK_OPTIONS.failedToLoadMessage}: ${testError}`
                );
                assert.strictEqual(showQuickPickStub.called, false);
                assert.strictEqual(result, undefined);
            });

            it('should use default failed to load message when not provided', async () => {
                const testError = new Error('Network error');
                const optionsWithoutMessage = {
                    placeHolder: 'Select environment'
                };
                
                mockCli.environments.rejects(testError);

                const result = await showEnvironmentQuickPick(mockCli, optionsWithoutMessage);

                assert.strictEqual(showErrorMessageStub.calledOnce, true);
                assert.strictEqual(
                    showErrorMessageStub.firstCall.args[0],
                    `Failed to load environments.: ${testError}`
                );
                assert.strictEqual(result, undefined);
            });

            it('should handle string errors properly', async () => {
                const stringError = 'String error message';
                mockCli.environments.rejects(stringError);

                const result = await showEnvironmentQuickPick(mockCli, QUICK_PICK_OPTIONS);

                assert.strictEqual(showErrorMessageStub.calledOnce, true);
                assert.strictEqual(
                    showErrorMessageStub.firstCall.args[0],
                    `${QUICK_PICK_OPTIONS.failedToLoadMessage}: ${stringError}`
                );
                assert.strictEqual(result, undefined);
            });
        });

        describe('input validation', () => {
            beforeEach(() => {
                mockCli.environments.resolves(MOCK_ENVIRONMENTS);
            });

            it('should handle placeHolder parameter correctly', async () => {
                const customOptions = {
                    placeHolder: 'Choose your environment'
                };
                
                showQuickPickStub.resolves(undefined);

                await showEnvironmentQuickPick(mockCli, customOptions);

                const quickPickOptions = showQuickPickStub.firstCall.args[1];
                assert.strictEqual(quickPickOptions.placeHolder, 'Choose your environment');
            });

            it('should destructure options with default values correctly', async () => {
                const minimalOptions = {
                    placeHolder: 'Test'
                };
                
                mockCli.environments.resolves([]);

                await showEnvironmentQuickPick(mockCli, minimalOptions);

                // Should use default message
                assert.strictEqual(showInformationMessageStub.calledOnce, true);
                assert.strictEqual(
                    showInformationMessageStub.firstCall.args[0],
                    'No environments available.'
                );
            });
        });
    });

    describe('createCliInstance', () => {
        it('should create CLI instance with provided workspace path', () => {
            const customPath = '/custom/workspace/path';

            const result = createCliInstance(customPath);

            assert.strictEqual(createContainerUseCliStub.calledOnce, true);
            assert.deepStrictEqual(createContainerUseCliStub.firstCall.args[0], {
                workspacePath: customPath
            });
            assert.strictEqual(result, mockCli);
        });

        it('should use first workspace folder when no path provided', () => {
            const result = createCliInstance();

            assert.strictEqual(createContainerUseCliStub.calledOnce, true);
            assert.deepStrictEqual(createContainerUseCliStub.firstCall.args[0], {
                workspacePath: TEST_WORKSPACE_PATH
            });
            assert.strictEqual(result, mockCli);
        });

        it('should use empty string when no workspace and no path provided', () => {
            workspaceFoldersStub.value(undefined);

            const result = createCliInstance();

            assert.strictEqual(createContainerUseCliStub.calledOnce, true);
            assert.deepStrictEqual(createContainerUseCliStub.firstCall.args[0], {
                workspacePath: ''
            });
            assert.strictEqual(result, mockCli);
        });

        it('should handle empty workspace folders array', () => {
            workspaceFoldersStub.value([]);

            const result = createCliInstance();

            assert.strictEqual(createContainerUseCliStub.calledOnce, true);
            assert.deepStrictEqual(createContainerUseCliStub.firstCall.args[0], {
                workspacePath: ''
            });
            assert.strictEqual(result, mockCli);
        });

        it('should prefer provided path over workspace folders', () => {
            const providedPath = '/provided/path';

            const result = createCliInstance(providedPath);

            assert.strictEqual(createContainerUseCliStub.calledOnce, true);
            assert.deepStrictEqual(createContainerUseCliStub.firstCall.args[0], {
                workspacePath: providedPath
            });
            // Should not use workspace folder path
            assert.notStrictEqual(createContainerUseCliStub.firstCall.args[0].workspacePath, TEST_WORKSPACE_PATH);
            assert.strictEqual(result, mockCli);
        });

        it('should handle multiple workspace folders by using first one', () => {
            const secondWorkspace = {
                uri: { fsPath: '/second/workspace' },
                name: 'second-workspace',
                index: 1
            };
            
            workspaceFoldersStub.value([
                {
                    uri: { fsPath: TEST_WORKSPACE_PATH },
                    name: 'test-workspace',
                    index: 0
                },
                secondWorkspace
            ]);

            const result = createCliInstance();

            assert.strictEqual(createContainerUseCliStub.calledOnce, true);
            assert.deepStrictEqual(createContainerUseCliStub.firstCall.args[0], {
                workspacePath: TEST_WORKSPACE_PATH
            });
            assert.strictEqual(result, mockCli);
        });
    });

    describe('integration scenarios', () => {
        it('should work with real-world environment data structure', async () => {
            const realisticEnvironments: Environment[] = [
                {
                    id: 'feature-login',
                    name: 'feature-login',
                    title: 'Login Feature Development',
                    created: '2024-06-20T08:30:00Z',
                    updated: '2024-06-20T14:45:00Z'
                },
                {
                    id: 'bugfix-auth',
                    name: 'bugfix-auth',
                    title: 'Authentication Bug Fix'
                    // No created/updated dates
                }
            ];

            mockCli.environments.resolves(realisticEnvironments);
            
            const selectedEnvironment = {
                label: 'feature-login',
                description: 'Login Feature Development',
                detail: 'Created: 2024-06-20T08:30:00Z',
                environment: realisticEnvironments[0]
            };
            showQuickPickStub.resolves(selectedEnvironment);

            const result = await showEnvironmentQuickPick(mockCli, {
                placeHolder: 'Select environment for development'
            });

            assert.deepStrictEqual(result, realisticEnvironments[0]);
            
            // Verify proper mapping of realistic data
            const quickPickItems = showQuickPickStub.firstCall.args[0];
            assert.strictEqual(quickPickItems[0].label, 'feature-login');
            assert.strictEqual(quickPickItems[0].description, 'Login Feature Development');
            assert.strictEqual(quickPickItems[1].detail, undefined); // No created date
        });
    });
});
