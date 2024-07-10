import fs from "node:fs";
import split from "split";
import pRetry from "p-retry";

import { Readable, Writable } from "stream";
import { generateWithRenderedPrompt } from "./openai.js";
import { getStreamForJsonl, getStreamForSingle } from "./utils.js";
import { renderPrompt } from "./render.js";
import { getCache, objectHash } from "./cache.js";
import { FileSystemCache } from "file-system-cache";
import { getQueue } from "./queue.js";
import { setupDisplay } from "./display.js";
import { validateJson } from "./validate.js";

function loadAndValidatePrompt(promptPath: string): any {
  let promptConfigText = null;
  let promptConfig = null;
  try {
    promptConfigText = fs.readFileSync(promptPath, "utf8");
  } catch (err) {
    console.error(`Error reading file: ${promptPath}`);
    return;
  }
  try {
    if (promptConfigText) {
      promptConfig = JSON.parse(promptConfigText);
    }
  } catch (err) {
    console.error(`Invalid JSON: ${promptPath}`);
    return;
  }
  if (!validateJson("prompt", promptConfig)) {
    console.error(`JSON does not match schema: ${promptPath}`);
    return;
  }
  return promptConfig;
}

/**
 * Used for single prompt generation or for running a rendered prompt
 * for batch generation. Returns a single run result object.
 */
async function singlePromptGeneration(promptConfig: any): Promise<any> {
  let { metadata, ...prompt } = promptConfig;
  let options: any = {};
  // The whole rendered prompt config is used as the cache key
  let hash = objectHash(promptConfig);
  let cache: FileSystemCache | undefined = getCache();
  // Check the cache first
  if (cache) {
    let result = await cache.get(hash);
    if (result) return result;
  }
  if (metadata?.provider === "openai") {
    // Copy the headers into the OpenAI options
    if (metadata.headers) {
      options.headers = metadata.headers;
    }
    // Make the OpenAI request
    let result = await generateWithRenderedPrompt(prompt, options);
    let formattedResult = { request: prompt, result };
    // Store the result in the cache
    if (cache) {
      cache.set(hash, formattedResult);
    }
    return formattedResult;
  } else {
    throw "Unsupported provider";
  }
}

/**
 * Used to render a prompt and generate a single result for batch generation.
 * Returns a single run result object.
 */
async function dataPromptGeneration(
  promptConfig: any,
  data: any
): Promise<any> {
  let renderedPrompt = renderPrompt(promptConfig, data);
  let result = await singlePromptGeneration(renderedPrompt);
  if (result) {
    return { ...result, promptConfig, data };
  }
  return null;
}

/**
 * Takes a stream of data and runs prompt generation on each line. Outputs each line to the output stream.
 */
async function runBatchWithStream(
  promptConfig: any,
  dataStream: Readable,
  outputStream: Writable,
  isJsonl: boolean
): Promise<void> {
  const queue = getQueue();
  setupDisplay(queue);
  // Split all the data and queue up each request.
  dataStream.pipe(split()).on("data", async (line) => {
    // Skip empty lines
    if (line.trim().length > 0) {
      // Items are added to the queue and run based on queue concurrency
      queue.add(async () => {
        return await pRetry(
          async () => {
            let data = JSON.parse(line);
            if (!data) {
              throw "Invalid JSON in data file";
            }
            let result = await dataPromptGeneration(promptConfig, data);
            let pretty = isJsonl
              ? JSON.stringify(result)
              : JSON.stringify(result, null, 2);
            outputStream.write(`${pretty}\n`);
          },
          {
            retries: 5,
            factor: 1.5,
            minTimeout: 20000,
            // onFailedAttempt: (error) =>
            // TODO: Implement debug mode, include this console log
            // console.debug("\n### ERROR ####\n", error),
          }
        );
      });
    }
  });
}

export default async function generate(
  promptPath: string,
  dataPath: string,
  output: Writable
): Promise<void> {
  // Load and validate the prompt configuration
  const promptConfig = loadAndValidatePrompt(promptPath);
  if (!promptConfig) {
    process.stderr.write("Invalid prompt configuration");
    return;
  }
  // Create a stream for the dataset, either from the file or from an empty dataset
  let dataStream = dataPath
    ? getStreamForJsonl(dataPath)
    : getStreamForSingle();

  await runBatchWithStream(promptConfig, dataStream, output, !!dataPath);
}
