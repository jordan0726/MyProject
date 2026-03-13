import type {Config} from 'jest';

const config: Config = {
    testEnvironment: 'node',
    roots: ['<rootDir>/src', '<rootDir>/test'],
    testMatch: ['**/*.test.ts'],
    transform: {
        '^.+\\.(ts|tsx)$': [
            'ts-jest',
            {
                tsconfig: '<rootDir>/tsconfig.json',
                diagnostics: true
            }
        ]
    },

    coverageProvider: 'v8',

    collectCoverage: true,
    collectCoverageFrom: [
        '<rootDir>/src/**/*.ts',
        '!<rootDir>/src/**/*.d.ts'
    ],
    coveragePathIgnorePatterns: ['/node_modules/', '/public', '/.bin/'],
    coverageDirectory: './coverage',

    coverageReporters: [
        ['text', { skipFull: false, skipEmpty: false }],
        'text-summary',
        'json-summary',
        'lcov'
    ],
    reporters: [
        'default',
        [
            'jest-junit',
            {
                outputDirectory: 'reports/junit',
                outputName: 'junit.xml'
            }
        ]
    ],

    moduleFileExtensions: ['ts', 'js'],
    testPathIgnorePatterns: ['/node_modules/', '/public', '/.bin/']
};

export default config;