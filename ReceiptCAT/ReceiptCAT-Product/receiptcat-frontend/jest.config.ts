import nextJest from 'next/jest';
const createJestConfig = nextJest({ dir: './' });

const config = {
    testEnvironment: 'jsdom',
    setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
    roots: ['<rootDir>/src'],
    testMatch: ['**/*.test.ts', '**/*.test.tsx'],

    coverageProvider: 'v8',

    collectCoverage: true,
    collectCoverageFrom: [
        '<rootDir>/src/pages/*.{ts,tsx}',
        '<rootDir>/src/components/*.{ts,tsx}',
        '<rootDir>/src/utils/*.{ts,tsx}',
        '<rootDir>/src/layouts/*.{ts,tsx}',
        '<rootDir>/src/pages/app/*.{ts,tsx}',
        '<rootDir>/src/pages/app/receipt/*.{ts,tsx}',
        '<rootDir>/src/pages/app/receipt/[receiptId]/*.{ts,tsx}',
        '!<rootDir>/src/styles/**',
        '!<rootDir>/src/tests/**',
        '!<rootDir>/src/pages/_app.tsx',
        '!<rootDir>/src/pages/_document.tsx',
        '!<rootDir>/src/components/EditableItemRow.styles.ts'
    ],
    coveragePathIgnorePatterns: ['/node_modules/', '/public', '/.next/', '/cypress/'],
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

    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
    testPathIgnorePatterns: ['/node_modules/', '/public', '/.next/', '/cypress/']
};

export default createJestConfig(config);