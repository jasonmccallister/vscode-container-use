import * as assert from 'assert';
import * as sinon from 'sinon';
import { EventEmitter } from 'events';
import { exists } from '../../utils/executable';

describe('executable.exists', () => {
    let mockProcess: any;
    let spawnStub: sinon.SinonStub;

    beforeEach(() => {
        // Create a mock process that extends EventEmitter
        mockProcess = new EventEmitter();
        mockProcess.stdout = new EventEmitter();
        mockProcess.stderr = new EventEmitter();
        mockProcess.kill = sinon.stub();

        // Stub the spawn function
        spawnStub = sinon.stub(require('child_process'), 'spawn').returns(mockProcess);
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('Happy Path Tests', () => {
        it('should return true when command exists and exits with code 0', async () => {
            // Arrange
            const command = 'ls';
            const expectedArgs = ['-h'];

            // Act
            const promise = exists(command);
            
            // Simulate successful execution
            process.nextTick(() => {
                mockProcess.emit('close', 0);
            });

            const result = await promise;

            // Assert
            assert.strictEqual(result, true);
            assert.ok(spawnStub.calledOnceWith(command, expectedArgs, { stdio: ['ignore', 'pipe', 'pipe'] }));
        });

        it('should return true when command exists with custom args and exits with code 0', async () => {
            // Arrange
            const command = 'git';
            const customArgs = ['--version'];

            // Act
            const promise = exists(command, customArgs);
            
            // Simulate successful execution
            process.nextTick(() => {
                mockProcess.emit('close', 0);
            });

            const result = await promise;

            // Assert
            assert.strictEqual(result, true);
            assert.ok(spawnStub.calledOnceWith(command, customArgs, { stdio: ['ignore', 'pipe', 'pipe'] }));
        });

        it('should return true when command output contains required text', async () => {
            // Arrange
            const command = 'docker';
            const requiredOutput = 'usage';

            // Act
            const promise = exists(command, undefined, requiredOutput);
            
            // Simulate command output and successful exit
            process.nextTick(() => {
                mockProcess.stdout.emit('data', 'Docker Usage: docker [OPTIONS] COMMAND');
                mockProcess.emit('close', 0);
            });

            const result = await promise;

            // Assert
            assert.strictEqual(result, true);
        });

        it('should return true when required text is in stderr (case insensitive)', async () => {
            // Arrange
            const command = 'mycommand';
            const requiredOutput = 'HELP';

            // Act
            const promise = exists(command, undefined, requiredOutput);
            
            // Simulate command output in stderr and successful exit
            process.nextTick(() => {
                mockProcess.stderr.emit('data', 'help information available');
                mockProcess.emit('close', 0);
            });

            const result = await promise;

            // Assert
            assert.strictEqual(result, true);
        });

        it('should handle empty args array by defaulting to -h', async () => {
            // Arrange
            const command = 'test-cmd';
            const emptyArgs: string[] = [];

            // Act
            const promise = exists(command, emptyArgs);
            
            // Simulate successful execution
            process.nextTick(() => {
                mockProcess.emit('close', 0);
            });

            const result = await promise;

            // Assert
            assert.strictEqual(result, true);
            assert.ok(spawnStub.calledOnceWith(command, ['-h'], { stdio: ['ignore', 'pipe', 'pipe'] }));
        });
    });

    describe('Sad Path Tests', () => {
        it('should return false when command exits with non-zero code', async () => {
            // Arrange
            const command = 'nonexistent';

            // Act
            const promise = exists(command);
            
            // Simulate failed execution
            process.nextTick(() => {
                mockProcess.emit('close', 1);
            });

            const result = await promise;

            // Assert
            assert.strictEqual(result, false);
        });

        it('should return false when command exists but required output is missing', async () => {
            // Arrange
            const command = 'ls';
            const requiredOutput = 'nonexistent-text';

            // Act
            const promise = exists(command, undefined, requiredOutput);
            
            // Simulate command with output that doesn't contain required text
            process.nextTick(() => {
                mockProcess.stdout.emit('data', 'some other output');
                mockProcess.emit('close', 0);
            });

            const result = await promise;

            // Assert
            assert.strictEqual(result, false);
        });

        it('should return false when command exits with 0 but output missing required text', async () => {
            // Arrange
            const command = 'echo';
            const requiredOutput = 'missing-text';

            // Act
            const promise = exists(command, undefined, requiredOutput);
            
            // Simulate successful exit but wrong output
            process.nextTick(() => {
                mockProcess.stdout.emit('data', 'hello world');
                mockProcess.emit('close', 0);
            });

            const result = await promise;

            // Assert
            assert.strictEqual(result, false);
        });

        it('should return false when spawn throws an error', async () => {
            // Arrange
            spawnStub.restore(); // Remove the stub
            spawnStub = sinon.stub(require('child_process'), 'spawn').throws(new Error('Spawn failed'));

            const command = 'failing-command';

            // Act
            const result = await exists(command);

            // Assert
            assert.strictEqual(result, false);
        });

        it('should return false when process emits error event', async () => {
            // Arrange
            const command = 'error-command';

            // Act
            const promise = exists(command);
            
            // Simulate process error
            process.nextTick(() => {
                mockProcess.emit('error', new Error('Process failed'));
            });

            const result = await promise;

            // Assert
            assert.strictEqual(result, false);
        });

        it('should return false and kill process when timeout is reached', async () => {
            // Arrange
            const command = 'hanging-command';

            // Act - Use a very short timeout for testing
            const promise = exists(command);
            
            // Don't emit any events to simulate hanging process
            // The timeout should trigger after 5 seconds

            const result = await promise;

            // Assert
            assert.strictEqual(result, false);
            // Note: In a real test, you might want to stub setTimeout to make this test faster
        });

        it('should return false when required output check fails with non-zero exit', async () => {
            // Arrange
            const command = 'failing-cmd';
            const requiredOutput = 'some-text';

            // Act
            const promise = exists(command, undefined, requiredOutput);
            
            // Simulate command that has required output but fails
            process.nextTick(() => {
                mockProcess.stdout.emit('data', 'some-text is here');
                mockProcess.emit('close', 1); // Non-zero exit
            });

            const result = await promise;

            // Assert
            assert.strictEqual(result, false);
        });
    });

    describe('Edge Cases', () => {
        it('should handle command with no stdout/stderr data', async () => {
            // Arrange
            const command = 'silent-command';

            // Act
            const promise = exists(command);
            
            // Simulate process that produces no output but exits successfully
            process.nextTick(() => {
                mockProcess.emit('close', 0);
            });

            const result = await promise;

            // Assert
            assert.strictEqual(result, true);
        });

        it('should handle large output streams', async () => {
            // Arrange
            const command = 'verbose-command';
            const requiredOutput = 'needle';

            // Act
            const promise = exists(command, undefined, requiredOutput);
            
            // Simulate large output with required text
            process.nextTick(() => {
                // Emit multiple chunks of data
                mockProcess.stdout.emit('data', 'lots of output '.repeat(1000));
                mockProcess.stdout.emit('data', 'more output with needle in it');
                mockProcess.stdout.emit('data', 'even more output '.repeat(1000));
                mockProcess.emit('close', 0);
            });

            const result = await promise;

            // Assert
            assert.strictEqual(result, true);
        });

        it('should handle mixed stdout and stderr with required output in stderr', async () => {
            // Arrange
            const command = 'mixed-output';
            const requiredOutput = 'error-help';

            // Act
            const promise = exists(command, undefined, requiredOutput);
            
            // Simulate output in both stdout and stderr
            process.nextTick(() => {
                mockProcess.stdout.emit('data', 'normal output');
                mockProcess.stderr.emit('data', 'error-help information');
                mockProcess.emit('close', 0);
            });

            const result = await promise;

            // Assert
            assert.strictEqual(result, true);
        });

        it('should be case insensitive for required output matching', async () => {
            // Arrange
            const command = 'case-test';
            const requiredOutput = 'HeLp'; // Mixed case

            // Act
            const promise = exists(command, undefined, requiredOutput);
            
            // Simulate output with different case
            process.nextTick(() => {
                mockProcess.stdout.emit('data', 'this contains help information');
                mockProcess.emit('close', 0);
            });

            const result = await promise;

            // Assert
            assert.strictEqual(result, true);
        });
    });
});
