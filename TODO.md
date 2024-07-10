# DEVAL TODO

## SOON

- Final name decision
- README cleanup
- Mark open-source
- Publish to NPM
- Does JSON import work for schema

## MID-TERM

- Finalize output schema - Especially around eval results.
- Override Promptfoo caching and/or provider to better fit into existing queue/caching mechanisms
- Cost calculation for eval assert but mostly for total cost on result
  - Use the json from litellm?
- Fix up concurrency in evaluation to be more concurrent
- Better handling of errors. Error should not fail a run. Or there should be an option to not fail for certain errors
- Improve folder support for multiple versions of prompts in a single file. Output named after the prompt file.
- Automatically adjust concurrency if a rate limit is hit?

## LONG-TERM

- Support input on stdin - dataset for generation, dataset or run for evals?
- How to test chains?
- How to use a chain in eval
- Support for other model providers
- Ordering of responses (Is this important?)
- Typescript types
- Support for [LLM Comparator](https://github.com/pair-code/llm-comparator)?
  - Likely this is a new command to smoosh two previous runs into one compatible file
  - Or support multiple versions within a folder
- More config around cache. Override TTL. Ability to clear cache.
