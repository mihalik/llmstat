import PQueue from "p-queue";
import { getConfig } from "./index.js";
import ora, { Ora } from "ora";

let installed = false;
let completed = 0;
let spinner: Ora | undefined = undefined;

/**
 * Sets up the output display for the status of the queue.  This will only display
 * if the output is not to stdout.
 */
export function setupDisplay(queue: PQueue): Ora | undefined {
  // Only hook up all the events once
  if (installed) return spinner;
  installed = true;

  const config = getConfig();
  const shouldDisplay = config.output !== undefined;

  if (shouldDisplay) {
    spinner = ora("").start();
  }

  queue.on("active", () => {
    if (spinner) {
      spinner.text = `Working...  Queued: ${queue.size},  Active: ${queue.pending}, Completed: ${completed}`;
    }
  });

  queue.on("next", () => {
    if (spinner) {
      spinner.text = `Working...  Queued: ${queue.size},  Active: ${queue.pending}, Completed: ${completed}`;
    }
  });

  queue.on("completed", () => {
    completed++;
  });

  queue.on("idle", () => {
    if (spinner) {
      spinner.succeed(`Completed ${completed} requests`);
    }
  });

  queue.on("error", (error) => {
    console.error("\n ### Queue error ### \n", error);
  });
}
