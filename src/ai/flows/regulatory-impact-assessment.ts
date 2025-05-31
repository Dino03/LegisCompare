'use server';

/**
 * @fileOverview This file defines a Genkit flow for assessing the regulatory impact of bill comparisons on SEC regulations and drafting initial comments.
 *
 * - regulatoryImpactAssessment -  A function that takes bill comparison results and assesses their potential impact on SEC regulations, drafting initial comments.
 * - RegulatoryImpactAssessmentInput - The input type for the regulatoryImpactAssessment function, representing the bill comparison results.
 * - RegulatoryImpactAssessmentOutput - The output type for the regulatoryImpactAssessment function, representing the draft comments and impact assessment.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RegulatoryImpactAssessmentInputSchema = z.object({
  billComparison: z.string().describe('The comparison of two bills, including similarities, differences, and potential conflicts.'),
});
export type RegulatoryImpactAssessmentInput = z.infer<typeof RegulatoryImpactAssessmentInputSchema>;

const RegulatoryImpactAssessmentOutputSchema = z.object({
  impactAssessment: z.string().describe('An assessment of the potential impact on SEC regulations.'),
  draftComment: z.string().describe('A draft comment regarding the potential impact on SEC regulations.'),
});
export type RegulatoryImpactAssessmentOutput = z.infer<typeof RegulatoryImpactAssessmentOutputSchema>;

export async function regulatoryImpactAssessment(input: RegulatoryImpactAssessmentInput): Promise<RegulatoryImpactAssessmentOutput> {
  return regulatoryImpactAssessmentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'regulatoryImpactAssessmentPrompt',
  input: {schema: RegulatoryImpactAssessmentInputSchema},
  output: {schema: RegulatoryImpactAssessmentOutputSchema},
  prompt: `You are an AI expert in SEC regulations. Given the following bill comparison, assess the potential impact on SEC regulations and draft an initial comment.

Bill Comparison:
{{{billComparison}}}

Consider any potential conflicts, overlaps, or implications for existing regulations. Provide a detailed impact assessment and a well-structured draft comment.

Output in the following format:
Impact Assessment: [Your assessment of the impact on SEC regulations]
Draft Comment: [A draft comment suitable for submission to the SEC]`,
});

const regulatoryImpactAssessmentFlow = ai.defineFlow(
  {
    name: 'regulatoryImpactAssessmentFlow',
    inputSchema: RegulatoryImpactAssessmentInputSchema,
    outputSchema: RegulatoryImpactAssessmentOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
