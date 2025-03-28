module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'jsdom',
    testMatch: ['**/?(*.)+(spec|test).[jt]s?(x)'],
    collectCoverageFrom: [
        'src/**/*.{js,jsx,ts,tsx}',
        '!src/**/*.d.ts',
        '!src/index.ts',
        '!src/types/**/*'
    ],
    moduleNameMapper: {
        '\\.css$': '<rootDir>/test/mocks/styleMock.js'
    },
    setupFilesAfterEnv: ['<rootDir>/test/setupTests.ts'],
    transform: {
        '^.+\\.(js|jsx|ts|tsx)$': ['ts-jest', { tsconfig: 'tsconfig.json' }]
    },
    transformIgnorePatterns: [
        '/node_modules/(?!three|react-force-graph|d3)'
    ],
    globals: {
        'ts-jest': {
            isolatedModules: true,
        }
    }
};