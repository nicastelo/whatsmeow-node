import { spawn, type ChildProcess } from "node:child_process";
import { createInterface } from "node:readline";
import { randomUUID } from "node:crypto";
import { EventEmitter } from "node:events";
import type { IpcCommand, IpcResponse, IpcEvent } from "./types.js";
import { WhatsmeowError, TimeoutError, ProcessExitedError } from "./errors.js";

interface PendingRequest {
  resolve: (data: unknown) => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

export class GoProcess extends EventEmitter {
  private proc: ChildProcess | null = null;
  private pending = new Map<string, PendingRequest>();
  private commandTimeout: number;
  private cleanupHandler: (() => void) | null = null;

  constructor(
    private binaryPath: string,
    commandTimeout = 30_000,
  ) {
    super();
    this.commandTimeout = commandTimeout;
  }

  start(): void {
    if (this.proc) return;

    this.proc = spawn(this.binaryPath, [], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    // stdout: responses + events (JSON lines)
    // stdio: ["pipe", "pipe", "pipe"] guarantees these are non-null
    const stdoutRl = createInterface({ input: this.proc.stdout as NodeJS.ReadableStream });
    stdoutRl.on("line", (line) => this.handleStdoutLine(line));

    // stderr: structured logs (JSON lines)
    const stderrRl = createInterface({ input: this.proc.stderr as NodeJS.ReadableStream });
    stderrRl.on("line", (line) => this.handleStderrLine(line));

    this.proc.on("exit", (code) => {
      this.proc = null;
      // Reject all pending requests
      for (const [id, req] of this.pending) {
        clearTimeout(req.timer);
        req.reject(new ProcessExitedError(code));
        this.pending.delete(id);
      }
      this.emit("exit", { code });
    });

    this.proc.on("error", (err) => {
      this.emit("error", err);
    });

    // Let the child process not keep the event loop alive on its own.
    // Node will still wait for pending I/O (readline), but if user code
    // has nothing else to do, the process can exit and the "exit" handler
    // below will clean up.
    this.proc.unref();

    // Orphan prevention: kill child when Node exits
    this.cleanupHandler = () => this.kill();
    process.on("exit", this.cleanupHandler);
  }

  async send(cmd: string, args: Record<string, unknown> = {}): Promise<unknown> {
    if (!this.proc?.stdin?.writable) {
      throw new ProcessExitedError(null);
    }

    const id = randomUUID();
    const command: IpcCommand = { id, cmd, args };

    return new Promise<unknown>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new TimeoutError(id));
      }, this.commandTimeout);

      this.pending.set(id, { resolve, reject, timer });
      const stdin = this.proc?.stdin;
      if (stdin) stdin.write(JSON.stringify(command) + "\n");
    });
  }

  kill(): void {
    if (!this.proc) return;

    if (this.cleanupHandler) {
      process.removeListener("exit", this.cleanupHandler);
      this.cleanupHandler = null;
    }

    try {
      this.proc.kill("SIGTERM");
      // Force kill after 5 seconds
      const forceTimer = setTimeout(() => {
        try {
          this.proc?.kill("SIGKILL");
        } catch (_) {
          /* process already dead */
        }
      }, 5000);
      forceTimer.unref();
    } catch (_) {
      /* process already dead */
    }
    this.proc = null;
  }

  get alive(): boolean {
    return this.proc !== null && !this.proc.killed;
  }

  private handleStdoutLine(line: string): void {
    let parsed: IpcResponse | IpcEvent;
    try {
      parsed = JSON.parse(line);
    } catch {
      return;
    }

    // Response (has `id`) vs Event (has `event`)
    if ("id" in parsed && typeof (parsed as IpcResponse).id === "string") {
      const resp = parsed as IpcResponse;
      const req = this.pending.get(resp.id);
      if (!req) return;

      clearTimeout(req.timer);
      this.pending.delete(resp.id);

      if (resp.ok) {
        req.resolve(resp.data);
      } else {
        req.reject(new WhatsmeowError(resp.error ?? "Unknown error", resp.code ?? "ERR_UNKNOWN"));
      }
    } else if ("event" in parsed) {
      const evt = parsed as IpcEvent;
      this.emit(evt.event, evt.data);
    }
  }

  private handleStderrLine(line: string): void {
    try {
      const log = JSON.parse(line);
      this.emit("log", log);
    } catch {
      // Non-JSON stderr, emit as raw log
      this.emit("log", { level: "raw", msg: line });
    }
  }
}
