
'use server';

/**
 * @fileOverview AI-powered tool to generate a search-friendly description for a (hypothetical) product image.
 *
 * - describeImageForSearch - A function that generates a product description.
 * - DescribeImageInput - The input type for the describeImageForSearch function.
 * - DescribeImageOutput - The return type for the describeImageForSearch function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// For this mock, the input might not be strictly needed,
// but it's good practice for future expansion if we were to pass hints.
const DescribeImageInputSchema = z.object({
  userContext: z
    .string()
    .optional()
    .describe('Optional context or hint about the type of product image.'),
});
export type DescribeImageInput = z.infer<typeof DescribeImageInputSchema>;

const DescribeImageOutputSchema = z.object({
  description: z
    .string()
    .describe('A search-friendly description of the hypothetical image\'s content.'),
});
export type DescribeImageOutput = z.infer<typeof DescribeImageOutputSchema>;

export async function describeImageForSearch(
  input?: DescribeImageInput
): Promise<DescribeImageOutput> {
  return describeImageForSearchFlow(input || {});
}

const prompt = ai.definePrompt({
  name: 'describeImageForSearchPrompt',
  input: {schema: DescribeImageInputSchema},
  output: {schema: DescribeImageOutputSchema},
  prompt: `You are an assistant that describes images for product searches.
Imagine a common e-commerce product image.
Generate a concise 2-4 word search query that describes the main product in the hypothetical image.
Focus on typical e-commerce items.
Examples: "red running shoes", "black wireless headphones", "floral summer dress", "wooden coffee table", "stainless steel water bottle".
Provide a description for a new, random, common e-commerce product.
{{#if userContext}}Consider this hint: {{{userContext}}}{{/if}}`,
});

const describeImageForSearchFlow = ai.defineFlow(
  {
    name: 'describeImageForSearchFlow',
    inputSchema: DescribeImageInputSchema,
    outputSchema: DescribeImageOutputSchema,
  },
  async (input): Promise<DescribeImageOutput> => {
    const {output} = await prompt(input);
    if (!output || typeof output.description !== 'string' || output.description.trim() === '') {
        console.warn("Genkit flow 'describeImageForSearchFlow': AI output was empty, invalid, or did not match schema. Using fallback.");
        return { description: "fallback: AI visual search term" }; // More distinct fallback
    }
    return output;
  }
);
