
'use server';
/**
 * @fileOverview An AI flow to enhance a job posting's title and description.
 *
 * - enhanceJobDescription - A function that takes a job title and description and returns an improved version.
 * - EnhanceJobDescriptionInput - The input type for the enhanceJobDescription function.
 * - EnhanceJobDescriptionOutput - The return type for the enhanceJobDescription function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

export const EnhanceJobDescriptionInputSchema = z.object({
  title: z.string().describe('The original title of the job post.'),
  description: z.string().describe('The original description of the job post.'),
});
export type EnhanceJobDescriptionInput = z.infer<typeof EnhanceJobDescriptionInputSchema>;

export const EnhanceJobDescriptionOutputSchema = z.object({
  enhancedTitle: z.string().describe('A clear, professional, and appealing new title for the job.'),
  enhancedDescription: z.string().describe('A well-structured and detailed new description for the job, formatted for readability (e.g., with bullet points).'),
});
export type EnhanceJobDescriptionOutput = z.infer<typeof EnhanceJobDescriptionOutputSchema>;

export async function enhanceJobDescription(input: EnhanceJobDescriptionInput): Promise<EnhanceJobDescriptionOutput> {
  return enhanceJobDescriptionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'enhanceJobDescriptionPrompt',
  input: {schema: EnhanceJobDescriptionInputSchema},
  output: {schema: EnhanceJobDescriptionOutputSchema},
  prompt: `You are an expert at writing clear, concise, and appealing job descriptions for a local community help platform.
Your task is to take a user's raw job title and description and improve them.

**Instructions:**
1.  **Analyze the Input**: Understand the core task from the user's title and description.
2.  **Create an Enhanced Title**: The new title should be clear and professional. It should accurately summarize the job. Keep it relatively short.
3.  **Create an Enhanced Description**: Rewrite the description to be more structured and easy to read.
    - Use bullet points or short paragraphs.
    - Clarify the tasks involved.
    - If details are missing, state what a potential applicant might need to know (e.g., "Please specify the location," or "Consider adding required tools."). Do not make up details.
    - Maintain a friendly and encouraging tone.
4.  **Preserve Key Information**: Ensure all important details from the original post (like specific items, times, or locations mentioned) are included in the new version.

**Original Job Post:**
- **Title**: {{{title}}}
- **Description**: {{{description}}}

Now, provide the enhanced title and description based on these instructions.`,
});

const enhanceJobDescriptionFlow = ai.defineFlow(
  {
    name: 'enhanceJobDescriptionFlow',
    inputSchema: EnhanceJobDescriptionInputSchema,
    outputSchema: EnhanceJobDescriptionOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);
