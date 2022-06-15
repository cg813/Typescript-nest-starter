export function switchEnv<T>(cases: { [key: string]: T }, defaultVal: T): T {
  if (!process.env.NODE_ENV) {
    throw new Error('NODE_ENV is required');
  }

  if (Object.prototype.hasOwnProperty.call(cases, process.env.NODE_ENV)) {
    return cases[process.env.NODE_ENV];
  }

  return defaultVal;
}
