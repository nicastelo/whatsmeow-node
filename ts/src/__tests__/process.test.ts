import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";

const { spawnMock } = vi.hoisted(() => ({ spawnMock: vi.fn() }));
vi.mock("node:child_process", () => ({ spawn: spawnMock }));

import { GoProcess } from "../process.js";

class FakeChild extends EventEmitter {
  stdin = new PassThrough();
  stdout = new PassThrough();
  stderr = new PassThrough();
  exitCode: number | null = null;
  signalCode: NodeJS.Signals | null = null;
  kill = vi.fn(() => true);
  unref = vi.fn();
}

describe("GoProcess.kill", () => {
  let child: FakeChild;

  beforeEach(() => {
    vi.useFakeTimers();
    child = new FakeChild();
    spawnMock.mockReturnValue(child);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("sends SIGKILL if the process ignores SIGTERM for 5 seconds", () => {
    const proc = new GoProcess("/fake/binary");
    proc.start();
    proc.kill();

    expect(child.kill).toHaveBeenCalledWith("SIGTERM");
    expect(proc.alive).toBe(false);

    vi.advanceTimersByTime(5000);
    expect(child.kill).toHaveBeenCalledWith("SIGKILL");
  });

  it("does not send SIGKILL once the process has exited", () => {
    const proc = new GoProcess("/fake/binary");
    proc.start();
    proc.kill();

    child.exitCode = 0;
    child.emit("exit", 0);
    vi.advanceTimersByTime(5000);

    expect(child.kill).toHaveBeenCalledTimes(1);
    expect(child.kill).toHaveBeenCalledWith("SIGTERM");
  });
});
