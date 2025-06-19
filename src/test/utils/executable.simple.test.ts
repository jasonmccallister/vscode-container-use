import * as assert from 'assert';
import { exists } from '../../utils/executable';

suite('Executable Utils Test Suite', () => {
	test('exists function should be defined', () => {
		assert.ok(typeof exists === 'function');
	});

	test('exists should return false for non-existent command', async () => {
		const result = await exists('this-command-definitely-does-not-exist-12345');
		assert.strictEqual(result, false);
	});

	test('exists should return true for a command that exists (ls)', async () => {
		const result = await exists('ls');
		assert.strictEqual(result, true);
	});
});
