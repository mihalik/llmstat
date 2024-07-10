// Load environment variables from .env.  This must be first.
import "dotenv/config";
import { Command } from "commander";
import generate from "./generate.js";
import runEvals from "./evals.js";
import fs from "node:fs";

const program = new Command();

// Module level config makes the command-line options available to the rest of the code.
let config: { cache?: boolean; output?: string } = {};

export function getConfig() {
  return config;
}

program
  .name("lmeval")
  .description("Language Model Evaluation")
  .version("0.0.1");

program
  .command("generate")
  .description("Call a model to generate output")
  .option(
    "-p, --prompt <prompt config>",
    "Prompt configuration file. Must be .json format."
  )
  .option(
    "-d, --data <dataset file>",
    "Dataset file to use for generation.  Must be .jsonl format."
  )
  .option(
    "-f, --folder <prompt folder>",
    "A folder containing the files required for generation.  Must have a prompt.json and optionally a dataset.jsonl."
  )
  .option(
    "-o, --output <output file>",
    "Output file to write to. Will be .jsonl format."
  )
  .option("--no-cache", "Do not use cache for model results.")
  .action((commandConfig, commander) => {
    config = commandConfig;
    let { prompt, data, output, folder } = commandConfig;
    // Must provide a folder or a prompt
    if (!folder && !prompt) {
      console.error(
        "Either a prompt configuration or folder containing a prompt.json file must be provided."
      );
      commander.help();
    }
    // If provided a folder, use the prompt and data files in the folder
    // TODO: Make this more flexible, support multiple prompts
    if (folder) {
      prompt = `${folder}/prompt.json`;
      data = `${folder}/dataset.jsonl`;
    }
    let outputStream = output ? fs.createWriteStream(output) : process.stdout;
    generate(prompt, data, outputStream);
  });

program
  .command("eval")
  .description(
    "Run a set of evals.  The evals can run on previously generated results or can generate results for evaluation."
  )
  .option("-e, --evals <eval config>", "Eval configuration file.")
  .option(
    "-r, --run <run file>",
    "Previous run file to use for evaluation. Must be .jsonl format."
  )
  .option(
    "-p, --prompt <prompt config>",
    "Prompt configuration file. Must be .json format."
  )
  .option(
    "-d, --data <dataset file>",
    "Dataset file to use for generation.  Must be .jsonl format."
  )
  .option(
    "-f, --folder <prompt folder>",
    "A folder containing the files required for evaluation.  Must have a evals.json and either a prompt.json or run.json."
  )
  .option(
    "-o, --output <output file>",
    "Output file to write to. Will be .jsonl format."
  )
  .option("--no-cache", "Do not use cache for model results.")
  .action((commandConfig, commander) => {
    config = commandConfig;
    let { run, evals, prompt, data, output, folder } = commandConfig;
    // Must provide a folder, run file, or prompt
    if (!folder && !run && !prompt) {
      console.error(
        "Either a run file, prompt configuration, or folder must be provided."
      );
      commander.help();
    }
    // If provided a folder, use the prompt and data files in the folder
    // TODO: Make this more flexible, support multiple prompts
    if (folder) {
      prompt = fs.existsSync(`${folder}/prompt.json`)
        ? `${folder}/prompt.json`
        : undefined;
      run = fs.existsSync(`${folder}/run.jsonl`)
        ? `${folder}/run.jsonl`
        : undefined;
      data = `${folder}/dataset.jsonl`;
      evals = `${folder}/evals.json`;
    }
    if (!run && !prompt && !data) {
      console.error(
        "Either a run file or prompt configuration and dataset must be provided."
      );
      commander.help();
    }
    let outputStream = output ? fs.createWriteStream(output) : process.stdout;
    runEvals(run, evals, prompt, data, outputStream);
  });

program.parse();
