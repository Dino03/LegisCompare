// src/ai/flows/detailed-sec-bill-analysis.ts
'use server';

/**
 * @fileOverview Provides a detailed SEC-focused analysis of a single legislative bill.
 *
 * - detailedSECBillAnalysis - A function that performs a comprehensive analysis of a bill.
 * - DetailedSECBillAnalysisInput - The input type for the detailedSECBillAnalysis function.
 * - DetailedSECBillAnalysisOutput - The return type for the detailedSECBillAnalysis function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DetailedSECBillAnalysisInputSchema = z.object({
  billText: z.string().describe('The full text content of the bill to be analyzed.'),
  billTitle: z.string().optional().describe('The official title of the bill, if known.'),
  billNumber: z.string().optional().describe('The bill number (e.g., HB1234, S.567), if known.'),
  legislativeChamber: z.string().optional().describe('The legislative chamber (House/Senate), if known.'),
});
export type DetailedSECBillAnalysisInput = z.infer<typeof DetailedSECBillAnalysisInputSchema>;

const DetailedSECBillAnalysisOutputSchema = z.object({
  part1BillIdentification: z.object({
    fullTitle: z.string().describe('The full title of the bill.'),
    billNumber: z.string().describe('The bill number.'),
    legislativeChamber: z.string().describe('The legislative chamber (House/Senate).'),
    primarySponsors: z.string().describe("Comma-separated list of primary sponsor(s), or 'Not specified'."),
    dateOfIntroduction: z.string().describe("Date of introduction, or 'Not specified'."),
    currentStatus: z.string().describe("Current status in the legislative process, or 'Not specified'."),
    relatedBills: z.string().describe("Comma-separated list of related or companion bills, or 'None identified'."),
  }).describe("Part 1: Bill Identification Details"),
  part2ExecutiveSummary: z.object({
    mainObjectivesAndKeyProvisions: z.string().describe('Summary of the bill’s main objectives and key provisions in plain language.'),
    significantChangesOrNewMechanisms: z.array(z.string()).describe("List of 3-5 most significant changes or new mechanisms introduced by the bill."),
  }).describe("Part 2: Executive Summary"),
  part3RegulatoryImpactAndSECRelations: z.object({
    provisionsAffectingSEC: z.string().describe("Identification of provisions directly or indirectly affecting the Philippine SEC, its regulatory scope, or the capital markets, citing specific bill provisions where possible."),
    impactedLawsAndRegulations: z.string().describe("Specification of existing laws, rules, or SEC regulations that would be amended, repealed, or impacted, citing specific sections."),
    newSECRegulatoryObligations: z.string().describe("Assessment of whether the bill creates new regulatory obligations, reporting requirements, or oversight functions for the SEC."),
    conflictsWithSRCAndSECLaws: z.string().describe("Analysis of potential conflicts, overlaps, or inconsistencies with the Securities Regulation Code (SRC), its IRR, or other SEC-administered laws."),
  }).describe("Part 3: Regulatory Impact & SEC Relations"),
  part4LegalAndConstitutionalAnalysis: z.object({
    potentialLegalOrConstitutionalIssues: z.string().describe("Identification of any potential legal or constitutional issues raised by the bill."),
    languageClarityAndAmbiguities: z.string().describe("Analysis of the clarity of the bill’s language and any ambiguities that may hinder implementation or enforcement."),
    sunsetProvisionsAccountabilityAndReporting: z.string().describe("Notes on any sunset provisions, accountability measures, or reporting requirements found in the bill, or 'None identified'."),
  }).describe("Part 4: Legal & Constitutional Analysis"),
  part5StakeholderImpact: z.object({
    affectedSectorsIndustriesGroups: z.string().describe("Identification of which sectors, industries, or groups (including market participants, investors, listed companies, SROs, etc.) are directly affected."),
    potentialBenefitsOrDisadvantages: z.string().describe("Assessment of potential benefits or disadvantages for these stakeholders."),
    complianceBurdensOrRegulatoryRisks: z.string().describe("Highlight of any provisions that may create compliance burdens or regulatory risks."),
  }).describe("Part 5: Stakeholder Impact"),
  part6GovernanceAndEnforcement: z.object({
    shiftInRegulatoryPowers: z.string().describe("Analysis of how the bill may shift regulatory powers or responsibilities between the SEC and other government agencies or SROs."),
    avenuesForArbitrageAbuseUnintendedConsequences: z.string().describe("Identification of possible avenues for regulatory arbitrage, abuse, or unintended consequences."),
    adequacyOfEnforcementPenaltiesDisputeResolution: z.string().describe("Assessment of the adequacy of enforcement, penalties, and dispute resolution mechanisms in the bill."),
  }).describe("Part 6: Governance & Enforcement"),
  part7RecommendationsAndFurtherQuestions: z.object({
    keyQuestionsForSECInvestigation: z.array(z.string()).describe("List of 3-5 key questions or areas for further investigation relevant to the SEC."),
    processIrregularitiesUrgentIssuesExpertPerspectives: z.string().describe("Highlight of any process irregularities, urgent issues, or expert perspectives needed."),
    precedentsHistoricalContextInternationalPractices: z.string().describe("Notes on important precedents, historical context, or comparative international practices that may inform the analysis."),
  }).describe("Part 7: Recommendations & Further Questions"),
});
export type DetailedSECBillAnalysisOutput = z.infer<typeof DetailedSECBillAnalysisOutputSchema>;

export async function detailedSECBillAnalysis(input: DetailedSECBillAnalysisInput): Promise<DetailedSECBillAnalysisOutput> {
  return detailedSECBillAnalysisFlow(input);
}

const prompt = ai.definePrompt({
  name: 'detailedSECBillAnalysisPrompt',
  input: {schema: DetailedSECBillAnalysisInputSchema},
  output: {schema: DetailedSECBillAnalysisOutputSchema},
  prompt: `You are a lawyer at the Philippine Securities and Exchange Commission (SEC), specializing in legislative liaison and regulatory analysis. Your objective is to obtain a comprehensive, structured analysis of the following Philippine House or Senate bill, focusing on its potential regulatory impact, conflicts, and relations to the SEC and its implementing laws and regulations.

Please analyze the bill using the following detailed framework:

PART 1: BILL IDENTIFICATION
{{#if billTitle}}The bill's title is stated as: "{{billTitle}}"{{else}}Provide the full title based on the bill text.{{/if}}
{{#if billNumber}}The bill number is stated as: {{billNumber}}.{{else}}Provide the bill number based on the bill text.{{/if}}
{{#if legislativeChamber}}The legislative chamber is stated as: {{legislativeChamber}}.{{else}}Identify the legislative chamber (House/Senate) based on the bill text or number.{{/if}}
    Identify primary sponsor(s), date of introduction, and current status in the legislative process. If not in the text, state 'Not specified in provided text'.
    List any related or companion bills. If not in the text, state 'Not specified in provided text'.

PART 2: EXECUTIVE SUMMARY
    Summarize the bill’s main objectives and key provisions in plain language.
    Identify the 3-5 most significant changes or new mechanisms introduced.

PART 3: REGULATORY IMPACT & SEC RELATIONS
    Identify any provisions that directly or indirectly affect the Philippine SEC, its regulatory scope, or the capital markets (e.g., securities, exchanges, SROs, market participants, corporate governance, public offerings, tender offers, shelf registration, etc.). Cite specific bill provisions or text where possible.
    Specify which existing laws, rules, or SEC regulations would be amended, repealed, or impacted. Cite specific bill provisions or text where possible.
    Assess whether the bill creates new regulatory obligations, reporting requirements, or oversight functions for the SEC.
    Highlight any potential conflicts, overlaps, or inconsistencies with the Securities Regulation Code (SRC), its IRR, or other SEC-administered laws (e.g., Corporation Code, Investment Company Act).

PART 4: LEGAL & CONSTITUTIONAL ANALYSIS
    Identify any potential legal or constitutional issues raised by the bill.
    Analyze the clarity of the bill’s language and any ambiguities that may hinder implementation or enforcement.
    Note any sunset provisions, accountability measures, or reporting requirements. If none, state 'No specific sunset provisions, accountability measures, or reporting requirements identified in the text.'

PART 5: STAKEHOLDER IMPACT
    Identify which sectors, industries, or groups (including market participants, investors, listed companies, SROs, etc.) are directly affected.
    Assess potential benefits or disadvantages for these stakeholders.
    Highlight any provisions that may create compliance burdens or regulatory risks.

PART 6: GOVERNANCE & ENFORCEMENT
    Analyze how the bill may shift regulatory powers or responsibilities between the SEC and other government agencies or SROs.
    Identify possible avenues for regulatory arbitrage, abuse, or unintended consequences.
    Assess the adequacy of enforcement, penalties, and dispute resolution mechanisms.

PART 7: RECOMMENDATIONS & FURTHER QUESTIONS
    Suggest 3-5 key questions or areas for further investigation relevant to the SEC.
    Highlight any process irregularities, urgent issues, or expert perspectives needed.
    Note important precedents, historical context, or comparative international practices that may inform the analysis.

Instructions:
    For each section, cite specific bill provisions or text where possible.
    Maintain a non-partisan, objective, and evidence-based approach.
    Structure your output using clear headings and bullet points for readability as defined in the output schema. Ensure all fields in the output schema are populated.

The full text of the bill is provided below:
{{{billText}}}
`,
});

const detailedSECBillAnalysisFlow = ai.defineFlow(
  {
    name: 'detailedSECBillAnalysisFlow',
    inputSchema: DetailedSECBillAnalysisInputSchema,
    outputSchema: DetailedSECBillAnalysisOutputSchema,
  },
  async (input: DetailedSECBillAnalysisInput) => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error('The AI failed to return a structured output for detailed bill analysis.');
    }
    return output;
  }
);

