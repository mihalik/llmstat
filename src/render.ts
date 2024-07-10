import mustache from "mustache";

export function renderPrompt(promptConfig: any, data: any): string {
  const renderedPrompt = structuredClone(promptConfig);
  // Append any messages from the data into the prompt config
  const messages = data["deval-messages"] || data.messages;
  if (messages) {
    renderedPrompt.messages.push(...messages);
    // TODO: Delete the messages?  Or keep it in for complete data in the log?
  }
  // Iterate all messages in the prompt config
  for (let message of renderedPrompt.messages) {
    message.content = mustache.render(message.content, data);
  }
  // Also render all header values
  for (let header in renderedPrompt.metadata?.headers) {
    renderedPrompt.metadata.headers[header] = mustache.render(
      renderedPrompt.metadata.headers[header],
      data
    );
  }
  return renderedPrompt;
}
