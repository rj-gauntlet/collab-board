import type { Config } from "jest";

const config: Config = {
  testEnvironment: "jsdom",
  transform: {
    "^.+\\.(ts|tsx)$": ["ts-jest", { tsconfig: { jsx: "react-jsx" } }],
  },
  moduleNameMapper: {
    // Specific stubs must come BEFORE the catch-all @/ mapper
    "^@/lib/firebase$": "<rootDir>/src/__mocks__/firebase.ts",
    "^firebase/(.*)$": "<rootDir>/src/__mocks__/firebaseSdk.ts",
    "^konva(.*)$": "<rootDir>/src/__mocks__/konva.ts",
    "^react-konva$": "<rootDir>/src/__mocks__/react-konva.ts",
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  setupFilesAfterEnv: ["@testing-library/jest-dom"],
  testMatch: ["**/__tests__/**/*.test.(ts|tsx)"],
};

export default config;
