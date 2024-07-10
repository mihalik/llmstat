# DEval

> It’s easy to make something cool with LLMs, but very hard to make something production-ready with them.

- [Chip Huyen](https://huyenchip.com/2023/04/11/llm-engineering.html)

## What is `DEval`?

Command-line for generating responses from an LLM and evaluating those responses. Primarily focused on evaluating a prompts with datasets and comparing results across multiple runs.

_Goals:_

- All configuration based (no need to write code)
- Always json format for easy integration with other tools
- Support for all types of evaluations, simple functional evaluations or complex rubrics
- Runs fast by default, but you can slow it down if you need to

## Work in Progress

This project is under active development. This means there are limitations and some of the interfaces will likely change.

Current limitations:

- OpenAI only for generation and evaluation
- No support for cost assertions or overall cost reporting
- No support for expected errors or error assertions
- No support for automatically generating multiple outputs and evaluating them (run the same test X times in a row)
- No support for non-boolean results, thresholds, or weights
- Running fast means order is not guaranteed to follow the order of the inputs

## Usage

**Generate output**

```shell
# Single prompt can generate a single result
npx deval generate --prompt prompt.json

# Prompt + dataset can get batch results
npx deval generate --prompt prompt.json --data dataset.jsonl

# These can also write directly to a file (json for single, jsonl for batch)
npx deval generate -p prompt.json -d dataset.jsonl --output out.json

# You can also point to a folder containing prompt.json and dataset.jsonl
npx deval generate --folder examples/batch

```

**Run evaluations**

```shell
# Prompt + dataset + evals can evaluate all responses
npx deval eval --prompt prompt.json --data dataset.jsonl --eval eval.json

# If you have pre-generated responses you can use that + evals
npx deval eval --run run.jsonl --eval eval.json

# You can also point to a folder containing the appropriate files
npx deval eval --folder examples/rubric
```

**Environment variables**

Environment variables can be set in the environment or in a `.env` file in the directory where the command is run.

`OPENAI_API_KEY` - An API key for OpenAI. This key is required. Other environment variables supported by `openai-node` are also supported.
`DEVAL_CACHE_PATH` to override the cache directory. Default is `~/.deval/cache`.
`DEVAL_CONCURRENCY` - The number of concurrent requests that are run (default 6)
`DEVAL_REQUEST_INTERVAL_MS` - The number (in milliseconds) of seconds for rate limiting (default 60000)
`DEVAL_REQUEST_CAP` - The number of requests within the interval for rate limiting (default 1000)

**Rate limiting**

If DEval encounters a rate limit error (or other recoverable error from the API) it will retry with exponential backoff to try and recover from those errors. However, if you know you have a specific rate limit, it will be more efficient to configure DEval to run within that rate limit.

You can use the rate limiting environment variables to speed up or slow down your requests depending on the rate of requests you are trying to achieve. Use `DEVAL_CONCURRENCY` to increase the number of concurrent requests to run faster. Adust `DEVAL_REQUEST_INTERVAL_MS` and `DEVAL_REQUEST_CAP` to slow down requests. For example, if you wanted to run a maximum of 20 requests per minute you could set `DEVAL_REQUEST_INTERVAL_MS=60000, DEVAL_REQUEST_CAP=20` and this would prevent more than 20 requests per minute. If you wanted to spread those requests out through the minute it might be better to set `DEVAL_REQUEST_INTERVAL_MS=3000, DEVAL_REQUEST_CAP=1`. This would run a maximum of one request every 3 seconds.

## File formats

### Prompt config

A prompt config matches the format of the underlying api request. This is intended to reduce the complexity of using this prompt config within a production application and to reduce issues where parameters or options might not be moved to the production application after evaluation. There are with two differences from the standard model request format:

- The content can contain template variables rendered with [Mustache](https://mustache.github.io)
- The object contains a `metadata` section containing additional information that is not part of the request. It is primariy used for labeling and tracking prompt files.

```json
{
  "model": "gpt-3.5-turbo",
  "messages": [
    {"role": "system", "content": "You are an assistant.  Today's date is {{date}}."},
    ...
  ],
  "metadata": {
    "name": "test-prompt",
    "variant": "a",
    "provider": "openai"
  }
}
```

Possible fields in metadata:

- `provider` **(required)** - Only current supported value is `openai`
- `headers` - Custom headers to pass along with the request. These can contain templates with variables from the dataset. Example: `headers: {"x-header": "{{val}}"}`.
- Currently, all other fields are optional and useful for your own labeling and tracking. This metadata is included in all outputs.

### Dataset

Dataset is a JSON lines (.jsonl) file with variables used to render the prompt config. You can include extra fields that are not used for rendering for reference. All these fields are included in the output. In this case we includ `id` as an identifier for the data entry.

```json
{"id": "today", "date": "Thu Jun 20 2024"}
{"id": "yesterday", "date": "Wed Jun 19 2024"}
{"id": "broken", "date": "0"}
```

You can include specific named eval tests you want to run against each dataset with `evals` field (See Eval suite section below for how to define these).

```json
{"evals": ["is-true", "contains-thurs"], "date": "Thu Jun 20 2024"}
{"evals": ["is-true", "contains-wed"], "date": "Wed Jun 19 2024"}
{"evals": ["is-true"], "date": "0"}
```

_Advanced:_

To evaluate multi-turn applications you can provide the messages in the dataset. These messages are appended to the messages configured in your prompt config.

```json
{"id": "joke-question", "messages": [{"role": "user", "content": "Please tell me a joke"}]}
{"id": "joke-refusal", "messages": [{"role": "user", "content": "Please tell me a joke"},{"role": "assistant", "content": "No"},{"role": "user", "content": "That's not a good joke."}]}
```

_What happens if I have a variable named `evals`, or `messages` in my data used for rendering a prompt?_

You can prefix the lmeval variable with `lmeval-` and that will always be used for evals or messages instead of your variable. Example: if you prompt contains something like `here are your evals: {{evals}}` then you can include that string in your data as `evals` and you can use `lmeval-evals` to indicate the id of your line in the dataset.

### Run results

Run results contain the results of a generation run. The run results contain the result as well as the inputs that generated the results for display or re-run purposes. The results contain the full API results and not just the output text. This allows you to run assertions on things like token usage or perplexity if you request this in the prompt config.

Run results are jsonl with each line containing the following sections:

```json
{
  metadata: { ... },
  promptConfig: { ... },
  data: {...},
  request: { ... },
  result: { ... }
}
```

Run results are generally an output format for the tool. But, you can create your own run results to run evaluations against. The only required property is `result`. You can see an example in `examples/previous-run-evaluation/run.jsonl`

### Eval suite

An eval suite is a collection of individual tests to run against run results. Each entry in the dataset can require one or more tests per entry. The evals follow the [assertions format in Promptfoo](https://www.promptfoo.dev/docs/configuration/expected-outputs/) (Promptfoo is used to run the assertions).

```json
{
  "contains-wed": {
    "assert": "contains",
    "value": "Wed"
  },
  "contains-thurs": {
    "assert": "contains",
    "value": "Thu"
  },
  "not-fri": {
    "assert": "not-icontains",
    "value": "fri"
  }
}
```

The test named `default` will always run a set of tests for every result.

```json
{
  "default": {
    "type": "default",
    "value": [
      {
        "type": "not-icontains-any",
        "value": ["sorry", "as an ai"]
      }
      ...
    ]
  }
}
```

### Eval results

Eval results contain the results of a generation and evals run. Each line includes all data required to display information about the request or to re-run the request or evaluation if required. This is the same format as Run results with a newly added section `evalResults`.

Eval results are jsonl with each line containing the following sections.

```json
{
  metadata: { ... },
  promptConfig: { ... },
  data: {...},
  request: { ... },
  result: { ... }
  evalResults: { ... }
}
```
