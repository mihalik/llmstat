# lmeval

**This is a work in progress**

## What is `lmeval`?

Command-line (and JS library) for generating responses from an LLM and evaluating those responses. Primarily focused on evaluating a single prompt or use-case and comparing results across multiple runs. The input and output format is JSON so it can be integrated with existing tools.  

## Usage

```
# Single prompt can generate a single result
npx lmeval --prompt prompt.json

# Prompt + dataset can get batch results
npx lmeval --prompt prompt.json --data dataset.jsonl

# Prompt + dataset + evals can evaluate all responses
npx lmeval --prompt prompt.json --data dataset.jsonl --eval eval.json

# If you have pre-generated responses you can use that + evals
npx lmeval --run run.jsonl --eval eval.json
```
## Data formats

### Prompt config

A prompt config matches the format of the underlying model request with two differences:
* The content can contain template variables rendered with [Mustache](https://mustache.github.io)
* The object contains a `metadata` section containing additional information about the prompt config that won't be sent to the model



```
{
  "model": "gpt-3.5-turbo",
  "messages": [
    {"role": "system", "content": "You are an assistant.  Today's date is {{date}}."},
    ...
  ],
  "metadata": {
    "name": "test-prompt",
    "variant": "a",
  }
}
```

### Dataset

Dataset is a JSON lines (.jsonl) file with variables used to render the prompt config. Each entry can be named with `lmid` to be referenced later in results and evaluations.

```
{"lmid": "today", "date": "Thu Jun 20 2024"}
{"lmid": "yesterday", "date": "Wed Jun 19 2024"}
{"lmid": "broken", "date": "0"}
```

You can include specific eval tests you want to run against each dataset with `lmevals` field.

```
{"lmid": "today", "lmevals": ["my-group", "contains-thurs"], "date": "Thu Jun 20 2024"}
{"lmid": "yesterday", "lmevals": ["my-group", "contains-wed"], "date": "Wed Jun 19 2024"}
{"lmid": "broken", "lmevals": ["my-group"], "date": "0"}
```

*Advanced:*

To evaluate multi-turn applications you can provide the messages in the dataset.  These messages are appended to the messages configured in your prompt config.  

```
{"lmid": "joke-question", "lmmessages": [{"role": "user", "content": "Please tell me a joke"}]}
{"lmid": "joke-refusal", "lmmessages": [{"role": "user", "content": "Please tell me a joke"},{"role": "assistant", "content": "No"},{"role": "user", "content": "That's not a good joke."}]}
```

### Run results

Generally an output format 

### Eval suite

An eval suite is a collection of individual tests to run against run results. Each entry in the dataset can require one or more tests per entry.

```
{
  "contains-wed": {
    "assert": "contains",
    "value": "Wed"
  },
  "contains-thurs": {
    "assert": "contains",
    "value": "Thu"
  }
}
```

You can group tests together into a "rubric" or set of tests that run together.  Rather than two individual tests, you can just require "my-group" to run all the items in this group.

```
{
  "is-helpful": {
    "assert": "model-graded-closedqa",
    "value": "The result is a helpful response",
    "group": "my-group"
  },
  "is-concise": {
    "assert": "contains",
    "value": "The result is concise",
    "group": "my-group"
  }
}
```

### Eval results

Generally an output format 
