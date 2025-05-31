// src/ai/flows/bill-summarization.ts
'use server';

/**
 * @fileOverview A bill summarization AI agent.
 *
 * - summarizeBill - A function that handles the bill summarization process.
 * - SummarizeBillInput - The input type for the summarizeBill function.
 * - SummarizeBillOutput - The return type for the summarizeBill function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeBillInputSchema = z.object({
  billText: z.string().describe('The text content of the bill to be summarized.'),
  congressNumber: z.string().describe('The number of the congress that enacted the bill (e.g., 18th, 19th).'),
  billNumber: z.string().describe('The bill number (e.g., HB1234, SB5678).'),
});
export type SummarizeBillInput = z.infer<typeof SummarizeBillInputSchema>;

const SummarizeBillOutputSchema = z.object({
  summary: z.string().describe('A concise summary of the bill, highlighting key provisions and potential impacts.'),
});
export type SummarizeBillOutput = z.infer<typeof SummarizeBillOutputSchema>;

export async function summarizeBill(input: SummarizeBillInput): Promise<SummarizeBillOutput> {
  return summarizeBillFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeBillPrompt',
  input: {schema: SummarizeBillInputSchema},
  output: {schema: SummarizeBillOutputSchema},
  prompt: `You are an expert legal analyst tasked with summarizing congressional bills.

  Given the text of a bill, provide a concise summary that highlights the key provisions and potential impacts of the bill.
  Be sure to identify the context and purpose of the bill within the provided text.

  Bill Text: {{{billText}}}
  Congress Number: {{{congressNumber}}}
  Bill Number: {{{billNumber}}}`,
});

const summarizeBillFlow = ai.defineFlow(
  {
    name: 'summarizeBillFlow',
    inputSchema: SummarizeBillInputSchema,
    outputSchema: SummarizeBillOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
