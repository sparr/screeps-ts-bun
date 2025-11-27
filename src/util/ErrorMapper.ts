// source originally from https://github.com/screepers/screeps-typescript-starter/blob/master/src/utils/ErrorMapper.ts

import { SourceMapConsumer } from "source-map";

// Cache consumer
let _consumer: SourceMapConsumer;

export function consumer(): SourceMapConsumer {
  if (_consumer == null) {
    _consumer = new SourceMapConsumer(require("main.js.map"));
  }
  return _consumer;
}

// Cache previously mapped traces to improve performance
const cache: { [key: string]: string } = {};

/**
 * Generates a stack trace using a source map generate original symbol names.
 *
 * WARNING - EXTREMELY high CPU cost for first call after reset - >30 CPU! Use sparingly!
 * (Consecutive calls after a reset are more reasonable, ~0.1 CPU/ea)
 *
 * @param {Error | string} error The error or original stack trace
 * @returns {string} The source-mapped stack trace
 */
export function sourceMappedStackTrace(error: Error | string): string {
  const stack: string =
    error instanceof Error ? (error.stack as string) : error;
  if (Object.prototype.hasOwnProperty.call(cache, stack)) {
    return cache[stack] as string;
  }

  const re = /^\s+at\s+(.+?\s+)?\(?([0-z._\-\\\/]+):(\d+):(\d+)\)?$/gm;
  let match: RegExpExecArray | null;
  let outStack = error.toString();

  match = re.exec(stack);
  while (match) {
    if (match[2] === "main" && match[3] && match[4]) {
      const line = Number.parseInt(match[3], 10);
      // driver injects 36 characters of code before the content of each module
      // https://github.com/screeps/driver/blob/e691bd3ee843cb12ac4bedc68397b2b92709f622/lib/runtime/runtime-driver.js#L67
      const column = Number.parseInt(match[4], 10) - (line === 1 ? 36 : 0);
      const pos = consumer().originalPositionFor({
        line: line,
        column: column,
      });

      if (pos.line != null) {
        if (pos.name) {
          outStack += `\n    at ${pos.name} (${pos.source}:${pos.line}:${pos.column})`;
        } else {
          if (match[1]) {
            // no original source file name known - use file name from given trace
            outStack += `\n    at ${match[1]} (${pos.source}:${pos.line}:${pos.column})`;
          } else {
            // no original source file name known or in given trace - omit name
            outStack += `\n    at ${pos.source}:${pos.line}:${pos.column}`;
          }
        }
      } else {
        // no known position
        break;
      }
    } else {
      // no more parseable lines
      break;
    }
    match = re.exec(stack);
  }

  cache[stack] = outStack;
  return outStack;
}

export function wrapLoop(loop: () => void): () => void {
  return () => {
    try {
      loop();
    } catch (e) {
      if (e instanceof Error) {
        if ("sim" in Game.rooms) {
          const message = `Source maps don't work in the simulator - displaying original error`;
          console.log(
            `<span style='color:red'>${message}<br>${_.escape(e.stack)}</span>`,
          );
        } else {
          console.log(
            `<span style='color:red'>${_.escape(sourceMappedStackTrace(e))}</span>`,
          );
        }
      } else {
        // can't handle it
        throw e;
      }
    }
  };
}
