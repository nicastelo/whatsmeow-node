export class WhatsmeowError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "WhatsmeowError";
  }
}

export class TimeoutError extends WhatsmeowError {
  constructor(commandId: string) {
    super(`Command ${commandId} timed out`, "ERR_TIMEOUT");
    this.name = "TimeoutError";
  }
}

export class ProcessExitedError extends WhatsmeowError {
  constructor(exitCode: number | null) {
    super(`Go process exited with code ${exitCode}`, "ERR_PROCESS_EXITED");
    this.name = "ProcessExitedError";
  }
}
