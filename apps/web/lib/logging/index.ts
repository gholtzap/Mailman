import pino from "pino";
import { loggerConfig } from "./config";

export const logger = pino(loggerConfig);

interface LogContext {
  route?: string;
  userId?: string;
  [key: string]: unknown;
}

export function createLogger(context: LogContext) {
  return logger.child(context);
}
