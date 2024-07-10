import fs from "node:fs";
import split from "split";
import { assertions } from "promptfoo";
import { Readable, Writable, PassThrough } from "stream";

import generate from "./generate.js";
import { getStreamForJsonl } from "./utils.js";
import { FileSystemCache } from "file-system-cache";
import { getCache } from "./cache.js";
import { getQueue } from "./queue.js";
import { setupDisplay } from "./display.js";

// TODO: make load json file a utility function and use it here
function loadAndValidateEvals(evalsPath: string): any {
  let evalsConfigText = null;
  let evalsConfig = null;
  try {
    evalsConfigText = fs.readFileSync(evalsPath, "utf8");
  } catch (err) {
    console.error(`Error reading file: ${evalsPath}`);
    return;
  }
  try {
    if (evalsConfigText) {
      evalsConfig = JSON.parse(evalsConfigText);
    }
  } catch (err) {
    console.error(`Invalid JSON: ${evalsPath}`);
    return;
  }
  // TODO: Validate with zod
  return evalsConfig;
}

/**
 * Run an eval against a single run data object.  This might contain many assertions that need to run
 */
async function runSingleEval(runData: any, evalsConfig: any): Promise<any> {
  let cache: FileSystemCache | undefined = getCache();
  // Evals can be stored as two names
  // TODO: Validate as an array
  const requiredEvals = runData?.data?.["deval-evals"] || runData?.data?.evals;

  // Add results to the run data
  runData.evalResults = [];

  // These are the assertions we are going to run based on the evals configured in the
  // dataset and anything we are running by default.
  let asserts = [];

  // First, iterate through all the required evals in the data
  for (let evalName of requiredEvals || []) {
    // We'll include default below
    if (evalName === "default") continue;
    let evalConfig = evalsConfig[evalName];
    evalConfig.name = evalName;
    if (!evalConfig) {
      throw `Eval ${evalName} not found in evals configuration`;
    }
    asserts.push(evalConfig);
  }

  // If there is a default/default eval then we append all the items to the assert list
  if (evalsConfig.default && evalsConfig.default.type === "default") {
    asserts = asserts.concat(evalsConfig.default.value);
  }

  // If there is default but not type default, go ahead and append it as well
  if (evalsConfig.default && evalsConfig.default.type !== "default") {
    asserts.push(evalsConfig.default);
  }

  // If we don't have any evals to run we short-circuit and return success
  if (asserts.length === 0) {
    runData.evalResults = {
      // TODO: Fix this to final format.
      success: true,
      score: 1,
      namedScores: {},
      gradingResult: "No evals to run",
    };
    return runData;
  }

  // Get the LLM output from the run data
  const output = runData.result?.choices[0]?.message?.content;
  if (!output) {
    throw "Unable to determine output of results.  Is it the wrong format?";
  }

  // TODO: Calculate cost
  const cost = 0;

  // It is possible to run an eval without the original prompt
  const messages = runData.promptConfig?.messages || {};

  const queue = getQueue();
  setupDisplay(queue);

  const jobs = [];
  for (let assert of asserts) {
    jobs.push(
      queue.add(async () => {
        const result = await assertions.runAssertion({
          prompt: JSON.stringify(messages, null, 2),
          assertion: assert,
          test: { vars: runData.data },
          output,
          latencyMs: 0,
          logProbs: undefined,
          cost: 0,
        });
        runData.evalResults.push(result);
      })
    );
  }

  // TODO: Rather than awaiting these results before returning, we should just return all the jobs
  // and await one level up.  This would let us concurrently run all the evals rather than
  // just concurrently running all the assertions for a single data point. For large settings on
  // concurrency this could be a significant speedup.
  await Promise.all(jobs);
  return runData;
}

/**
 * Takes a stream of a run and runs an eval on each line. Outputs each line to the output stream.
 */
async function runEvalWithStream(
  runStream: Readable,
  evalsConfig: any,
  outputStream: Writable
): Promise<void> {
  // TODO: This might reorder the output.  This also runs all items in parallel and
  // will cause issues with rate limiting.  Likely this will eventually need a queue and we'll need to decide if there
  // is a hard requirement on the order of the output.
  runStream.pipe(split()).on("data", async (line) => {
    // Skip empty lines
    if (line.trim().length > 0) {
      let data = JSON.parse(line);
      if (!data) {
        throw "Invalid JSON in run file";
      }
      let result = await runSingleEval(data, evalsConfig);
      outputStream.write(`${JSON.stringify(result)}\n`);
    }
  });
}

export default async function runEvals(
  run: string,
  evalsPath: string,
  promptPath: string,
  dataPath: string,
  output: Writable
): Promise<void> {
  // Load and validate the evals configuration
  const evalsConfig = loadAndValidateEvals(evalsPath);
  if (!evalsConfig) {
    console.error("Invalid evals configuration");
    return;
  }

  // If they include a run, we need to load the run as a stream and run the eval.
  if (run) {
    // Load the run as a stream
    const runStream = getStreamForJsonl(run);
    await runEvalWithStream(runStream, evalsConfig, output);
    return;
  }

  const runStream = new PassThrough();
  if (promptPath) {
    await generate(promptPath, dataPath, runStream);
    await runEvalWithStream(runStream, evalsConfig, output);
  }
}
