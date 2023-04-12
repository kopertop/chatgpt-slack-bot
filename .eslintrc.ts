import { rules as baseStyleRules } from 'eslint-config-airbnb-base/rules/style';

const indentOptions = {
	SwitchCase: 1,
	ignoredNodes: [
		'FunctionExpression > .params[decorators.length > 0]',
		'FunctionExpression > .params > :matches(Decorator, :not(:first-child))',
		'ClassBody.body > PropertyDefinition[decorators.length > 0] > .key',
	],
};

const noUnusedVarsOptions = {
	vars: 'all',
	args: 'after-used',
	argsIgnorePattern: '^_',
	ignoreRestSiblings: true,
};

module.exports = {
	extends: [
		'airbnb-typescript/base',
	],
	settings: {
		'import/resolver': {
			// Allow .d.ts imports, e.g. ts-essentials
			typescript: {},
		},
	},
	plugins: [
		'@typescript-eslint',
		'deprecation',
		'github',
		'import',
		'import-newlines',
		'unused-imports',
	],
	rules: {
		//
		// Rule groups
		//

		// Allow empty constructors that initialize class members
		'no-empty-function': 'off',
		'@typescript-eslint/no-empty-function': 'error',
		'no-useless-constructor': 'off',
		'@typescript-eslint/no-useless-constructor': 'error',

		// Import statement ordering and grouping
		'import/order': ['error', {
			// Alphabetize files within each group
			alphabetize: {
				order: 'asc',
				caseInsensitive: true,
			},
			groups: [
				['builtin', 'external', 'internal'],
				['parent'],
				['sibling', 'index'],
			],
			'newlines-between': 'always',
		}],
		// Alphabetize members within each import statement
		'sort-imports': ['error', {
			ignoreDeclarationSort: true,
		}],

		// We <3 tabs
		indent: ['error', 'tab', indentOptions],
		'@typescript-eslint/indent': ['error', 'tab', indentOptions],
		'no-tabs': 'off',

		//
		// Individual rules
		//

		// Use Foo[] rather than Array<Foo>
		'@typescript-eslint/array-type': 'error',

		// Do not require camelCase since the data model uses snake_case and destructuring is
		// useful
		'@typescript-eslint/camelcase': 'off',
		'@typescript-eslint/naming-convention': [
			'error',
			{
				selector: 'variable',
				format: [
					'camelCase',
					'PascalCase',
					'UPPER_CASE',
				],
			},
			{
				selector: 'variable',
				modifiers: ['destructured'],
				format: [
					'camelCase',
					'PascalCase',
					'UPPER_CASE',
					'snake_case',
				],
			},
			{
				selector: 'function',
				format: [
					'camelCase',
					'PascalCase',
				],
			},
			{
				selector: 'typeLike',
				format: [
					'PascalCase',
				],
			},
		],

		// Do not require class methods to use this
		'class-methods-use-this': 'off',

		// For assignment in while loops
		'no-cond-assign': ['error', 'except-parens'],

		// Use interfaces when possible rather than types for compatibility with typedoc
		'@typescript-eslint/consistent-type-definitions': ['error', 'interface'],

		// Not compatible with type-only imports in TypeScript that are not subject
		// to import cycle concerns
		'import/no-cycle': 'off',

		// Do not allow importing @deprecated symbols
		'import/no-deprecated': 'off',
		'deprecation/deprecation': 'warn',

		// Default export should generally be avoided
		'import/prefer-default-export': 'off',

		// Require one symbol per line in long imports
		'import-newlines/enforce': [
			'error',
			{
				items: 3,
				'max-len': 120,
				semi: true,
			},
		],

		// For method overloading
		'no-dupe-class-members': 'off',

		// Require blank line between multiline class methods
		'@typescript-eslint/lines-between-class-members': ['error', 'always', {
			exceptAfterSingleLine: true,
		}],

		'max-classes-per-file': 'off',

		'max-len': ['error', 120, 2, {
			ignoreUrls: true,
			ignoreComments: false,
			ignoreRegExpLiterals: true,
			ignoreStrings: true,
			ignoreTemplateLiterals: true,
		}],

		// Require consistent order of class members based on visibility and other modifiers
		'@typescript-eslint/member-ordering': ['error', {
			default: [
				// Static
				'static-field',
				'static-method',

				// Index signature
				'signature',

				// Fields
				'abstract-field',
				'instance-field',

				// Constructors
				'constructor',

				// Methods
				'abstract-method',
				'instance-method',
			],
		}],

		// Require object literals to use multiple lines if more than 4 properties
		'object-curly-newline': ['error', {
			consistent: true,
			minProperties: 4,
		}],

		// Use whitespace inside { object: 'literals' }
		'object-curly-spacing': 'off',
		'@typescript-eslint/object-curly-spacing': ['error', 'always', {
			// Collapse whitespace when closing nested objects
			objectsInObjects: false,
		}],

		'no-param-reassign': [
			'error',
			{
				props: true,
				// Allow reassignment for common names (from eslint-config-airbnb)
				ignorePropertyModificationsFor: [
					'acc', // for reduce accumulators
					'accumulator', // for reduce accumulators
					'e', // for e.returnvalue
					'ctx', // for Koa routing
					'req', // for Express requests
					'request', // for Express requests
					'res', // for Express responses
					'response', // for Express responses
					'$scope', // for Angular 1 scopes
					'staticContext', // for ReactRouter context
				],
				// Allow reassignment for parameters with names indicating that the value will be changed
				ignorePropertyModificationsForRegex: [
					'^mutable',
				],
			},
		],

		// Ban ++ and -- everywhere but for loops
		'no-plusplus': ['error', {
			allowForLoopAfterthoughts: true,
		}],

		// Use const whenever possible, except in destructuring where at least one of the
		// destructured values needs to be let
		'prefer-const': [
			'error',
			{
				destructuring: 'all',
				ignoreReadBeforeAssign: true,
			},
		],

		// Use a?.b?.[0] rather than a && a.b && a.b[0]
		'@typescript-eslint/prefer-optional-chain': 'warn',

		// Disable commonly misused or error-prone syntax
		// Airbnb excludes ForOfStatement to avoid generators, but that's too harsh
		'no-restricted-syntax': baseStyleRules['no-restricted-syntax'].filter(
			(option) => typeof option === 'string' || option.selector !== 'ForOfStatement',
		),

		// Allow _leading underscore because some of our data sources use it
		'no-underscore-dangle': 'off',

		// Remove imported symbols that are not used
		'unused-imports/no-unused-imports': 'error',

		// Do not allow unused variables or arguments. Allows a leading underscore for arguments
		// that are difficult to avoid, such as array destructured function parameters.
		'no-unused-vars': ['off', noUnusedVarsOptions],
		'@typescript-eslint/no-unused-vars': ['off', noUnusedVarsOptions],

		// Warn when hoisting may lead to confusing code, except for functions
		'@typescript-eslint/no-use-before-define': ['error', 'nofunc'],

		// Require import instead of require
		'@typescript-eslint/no-var-requires': 'error',


		// NOTE: The base "no-redeclare" rule is messed up, so it must be disabled
		'no-redeclare': 'off',
		'@typescript-eslint/no-redeclare': ['error'],

		// console logging is *expected* for backend functions
		'no-console': 'off',

		// aws-lambda is a devDependency but it's available in Lambda directly
		'import/no-extraneous-dependencies': 'off',

		'no-continue': 'off',
		'guard-for-in': 'off',

		// Things I don't really care about on the backend
		'newline-per-chained-call': 'off',
		'consistent-return': 'off',
		'no-await-in-loop': 'off',
		'prefer-destructuring': 'off',
		'arrow-body-style': 'off',

		// Loops in functions aren't the greatest, but also are not necessarily aweful
		'no-loop-func': 'off',
		'@typescript-eslint/no-loop-func': ['warn'],

		// No Array.forEach is allowed
		'github/array-foreach': 'error',

		// Disable import extensions
		'import/extensions': 'off',
	},
};
