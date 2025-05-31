
// src/ai/flows/bill-comparison.ts
'use server';

/**
 * @fileOverview Compares and contrasts different bills to identify similarities, differences, and potential conflicts.
 *
 * - billComparison - A function that handles the bill comparison process.
 * - BillComparisonInput - The input type for the billComparison function.
 * - BillComparisonOutput - The return type for the billComparison function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const BillComparisonInputSchema = z.object({
  bill1Summary: z.string().describe('Summary of the first bill.'),
  bill2Summary: z.string().describe('Summary of the second bill.'),
});
export type BillComparisonInput = z.infer<typeof BillComparisonInputSchema>;

const BillComparisonOutputSchema = z.object({
  similarities: z.string().describe('Similarities between the two bills.'),
  differences: z.string().describe('Differences between the two bills.'),
  potentialConflicts: z.string().describe('Potential conflicts between the two bills.'),
  regulatoryImpactAssessmentBill1: z.string().describe('A detailed draft comment assessing the potential impact of Bill 1 on SEC regulations. If no impact, explicitly state "No significant SEC regulatory impact identified for Bill 1."'),
  regulatoryImpactAssessmentBill2: z.string().describe('A detailed draft comment assessing the potential impact of Bill 2 on SEC regulations. If no impact, explicitly state "No significant SEC regulatory impact identified for Bill 2."'),
});
export type BillComparisonOutput = z.infer<typeof BillComparisonOutputSchema>;

export async function billComparison(input: BillComparisonInput): Promise<BillComparisonOutput> {
  return billComparisonFlow(input);
}

const prompt = ai.definePrompt({
  name: 'billComparisonPrompt',
  input: {schema: BillComparisonInputSchema},
  output: {schema: BillComparisonOutputSchema},
  prompt: `You are an expert in comparing and contrasting legislative bills.

You will be provided with summaries of two bills. Your task is to identify the similarities, differences, and potential conflicts between them.
Additionally, assess the potential impact of each bill on SEC regulations and create a draft comment for each.

Bill 1 Summary: {{{bill1Summary}}}
Bill 2 Summary: {{{bill2Summary}}}

Analyze the bills and provide a detailed comparison, including:
- Similarities: Identify any common provisions, goals, or areas of focus.
- Differences: Highlight the distinct aspects of each bill, such as scope, approach, or specific requirements.
- Potential Conflicts: Determine if there are any areas where the bills might contradict or create inconsistencies if enacted together.
- Regulatory Impact Assessment Bill 1: Draft a comment that determines whether there might be an impact on the SEC's regulations for bill 1. If no impact, explicitly state 'No significant SEC regulatory impact identified for Bill 1.'
- Regulatory Impact Assessment Bill 2: Draft a comment that determines whether there might be an impact on the SEC's regulations for bill 2. If no impact, explicitly state 'No significant SEC regulatory impact identified for Bill 2.'`,
});

const billComparisonFlow = ai.defineFlow(
  {
    name: 'billComparisonFlow',
    inputSchema: BillComparisonInputSchema,
    outputSchema: BillComparisonOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

