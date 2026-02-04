import type { LoggerOptions } from "pino";

const isDev = process.env.NODE_ENV !== "production";

export const loggerConfig: LoggerOptions = {
  level: isDev ? "debug" : "info",
  ...(isDev
    ? {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "HH:MM:ss",
            ignore: "pid,hostname",
            singleLine: false,
          },
        },
      }
    : {
        formatters: {
          level: (label) => {
            return { level: label };
          },
        },
        timestamp: () => `,"time":"${new Date().toISOString()}"`,
      }),
};
