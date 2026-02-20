/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "jsdom",
  transform: {
    "^.+\\.(ts|tsx)$": ["ts-jest", { tsconfig: { jsx: "react-jsx" } }],
  },
  moduleNameMapper: {
    "^@/lib/firebase$": "<rootDir>/src/__mocks__/firebase.ts",
    "^firebase/(.*)$": "<rootDir>/src/__mocks__/firebaseSdk.ts",
    "^konva(.*)$": "<rootDir>/src/__mocks__/konva.ts",
    "^react-konva$": "<rootDir>/src/__mocks__/react-konva.ts",
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  setupFilesAfterEnv: ["@testing-library/jest-dom"],
  modulePathIgnorePatterns: ["<rootDir>/.next/"],
  testMatch: ["**/__tests__/**/*.test.(ts|tsx)"],
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/**/__mocks__/**",
    "!src/**/__tests__/**",
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "text-summary", "lcov", "html"],
};
