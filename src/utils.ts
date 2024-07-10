import fs from "node:fs";
import { Readable } from "stream";

/**
 * Returns a stream for the dataset file.
 */
export function getStreamForJsonl(dataPath: string): Readable {
  if (!dataPath.endsWith(".jsonl")) {
    throw "File must be in JSONL format";
  }
  return fs.createReadStream(dataPath);
}

/**
 * We treat a single prompt as a dataset with a single empty item.
 */
export function getStreamForSingle(): Readable {
  const readable = new Readable();
  readable.push("{}\n");
  readable.push(null);
  return readable;
}
