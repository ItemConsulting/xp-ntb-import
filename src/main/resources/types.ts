// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const app: {
  name: string;
  version: string;
  config: { [key: string]: string };
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const log: {
  info: (...args: unknown[]) => void;
  warning: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
};
