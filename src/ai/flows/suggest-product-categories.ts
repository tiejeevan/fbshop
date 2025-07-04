
'use server';

/**
 * @fileOverview AI-powered tool to suggest product categories based on product description.
 *
 * - suggestProductCategories - A function that suggests product categories based on a product description.
 * - SuggestProductCategoriesInput - The input type for the suggestProductCategories function.
 * - SuggestProductCategoriesOutput - The return type for the suggestProductCategories function.
 */

import {ai} from '@/ai/genkit';
import {googleAI} from '@genkit-ai/googleai';
import {z} from 'genkit';

const SuggestProductCategoriesInputSchema = z.object({
  productDescription: z
    .string()
    .describe('The description of the product for which categories are suggested.'),
});
export type SuggestProductCategoriesInput = z.infer<typeof SuggestProductCategoriesInputSchema>;

const SuggestProductCategoriesOutputSchema = z.object({
  categories: z
    .array(z.string())
    .describe('An array of suggested categories for the product.'),
});
export type SuggestProductCategoriesOutput = z.infer<typeof SuggestProductCategoriesOutputSchema>;

export async function suggestProductCategories(
  input: SuggestProductCategoriesInput
): Promise<SuggestProductCategoriesOutput> {
  return suggestProductCategoriesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestProductCategoriesPrompt',
  input: {schema: SuggestProductCategoriesInputSchema},
  output: {schema: SuggestProductCategoriesOutputSchema},
  model: googleAI.model('gemini-1.5-flash-latest'),
  prompt: `You are a helpful AI assistant that suggests relevant product categories based on a product description.

  Product Description: {{{productDescription}}}

  Suggest at least 3 relevant categories for the product.`,
});

const suggestProductCategoriesFlow = ai.defineFlow(
  {
    name: 'suggestProductCategoriesFlow',
    inputSchema: SuggestProductCategoriesInputSchema,
    outputSchema: SuggestProductCategoriesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
