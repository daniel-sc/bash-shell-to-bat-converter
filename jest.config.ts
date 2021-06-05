import type {Config} from '@jest/types';

// Sync object
const config: Config.InitialOptions = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  verbose: false,
  testMatch: undefined,
  testRegex: '.+\\.test\\.ts$'
};
export default config;