export default {
  debug,
  error: console.error.bind(console)
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function debug(...args: any[]): void {
  console.debug(new Date().toISOString(), ...args);
}
