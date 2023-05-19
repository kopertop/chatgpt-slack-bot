import { defineConfig } from 'vitest/config';

const BRANCH = process.env.CODEBUILD_SOURCE_VERSION || 'refs/heads/feature/sst';

export default defineConfig({
	test: {
		testTimeout: 90000,
		globals: true,
		threads: false,
		restoreMocks: true,
		reporters: [
			'basic',
			'junit',
		],
		outputFile: {
			junit: 'test-results.xml',
		},
	},
});
