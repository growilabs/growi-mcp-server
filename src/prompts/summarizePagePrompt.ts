import type { FastMCP } from 'fastmcp';

export function registerSummarizePagePrompt(server: FastMCP): void {
  server.addPrompt({
    name: 'summarizeGrowiPage',
    description: 'Summarize the content of a GROWI page.',
    arguments: [
      {
        name: 'pageContent',
        description: 'The content of the GROWI page to summarize.',
        required: true,
      },
      {
        name: 'summaryLength',
        description: 'Desired length of the summary (e.g., short, medium, long).',
        required: false,
        enum: ['short', 'medium', 'long'],
      },
    ],
    load: async (args) => {
      let prompt = `Please summarize the following page content:\n\n${args.pageContent}`;
      if (args.summaryLength) {
        prompt += `\n\nThe desired summary length is ${args.summaryLength}.`;
      }
      return prompt;
    },
  });
}
