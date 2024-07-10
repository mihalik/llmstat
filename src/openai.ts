import OpenAI from "openai";
import { AbortError } from "p-retry";

// These are errors that we likely should not retry.  Bad requests, authentication, etc.
const UNRECOVERABLE_ERRORS = [400, 401, 403, 404, 422];

// Should load configuration options from the environment by defaul
const openai = new OpenAI();

// Max time to wait for a response from the API
const TIMEOUT = 5 * 60 * 1000; // 5 minutes is long but less that the default 10 minutes
// Set retries to 0 because we handle retries one layer above
const MAX_RETRIES = 0;

export async function generateWithRenderedPrompt(
  renderedPrompt: any,
  options: any
) {
  options = { ...options, timeout: TIMEOUT, maxRetries: MAX_RETRIES };
  const chatCompletion = await openai.chat.completions
    .create(renderedPrompt, options)
    .catch((err) => {
      // We try to determine if the error is recoverable and we should retry.
      // For unknown errors we still retry.
      if (err instanceof OpenAI.APIError) {
        if (UNRECOVERABLE_ERRORS.includes(err.status || 0)) {
          throw new AbortError(err);
        }
      }
      throw err;
    });
  return chatCompletion;
}
