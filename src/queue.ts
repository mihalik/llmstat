import PQueue from "p-queue";
// import pRetry, { AbortError } from "p-retry";

// The defaults for concurrency will run 6 concurrent requests and will run a max of 1000 requests per minute.
// TODO: Also allow from command-line
const concurrency = Number(process.env.LLMSTAT_CONCURRENCY) || 6;
const requestInteval =
  Number(process.env.LLMSTAT_REQUEST_INTERVAL_MS) || 60 * 1000; // OpenAI uses requests per minute
const requestCap = Number(process.env.LLMSTAT_REQUEST_CAP) || 1000;

const queue = new PQueue({
  concurrency,
  intervalCap: requestCap,
  interval: requestInteval,
});

export function getQueue(): PQueue {
  return queue;
}
