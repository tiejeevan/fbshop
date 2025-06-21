'use server';
/**
 * @fileOverview An AI flow to generate a product description.
 *
 * - generateProductDescription - A function that takes a product name and category and returns a compelling description.
 * - GenerateProductDescriptionInput - The input type for the function.
 * - GenerateProductDescriptionOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {googleAI} from '@genkit-ai/googleai';
import {z} from 'genkit';

const GenerateProductDescriptionInputSchema = z.object({
  productName: z.string().describe('The name of the product.'),
  categoryName: z.string().describe('The category the product belongs to.'),
});
export type GenerateProductDescriptionInput = z.infer<typeof GenerateProductDescriptionInputSchema>;

const GenerateProductDescriptionOutputSchema = z.object({
  generatedDescription: z.string().describe('A compelling, SEO-friendly product description.'),
});
export type GenerateProductDescriptionOutput = z.infer<typeof GenerateProductDescriptionOutputSchema>;

export async function generateProductDescription(input: GenerateProductDescriptionInput): Promise<GenerateProductDescriptionOutput> {
  return generateProductDescriptionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateProductDescriptionPrompt',
  input: {schema: GenerateProductDescriptionInputSchema},
  output: {schema: GenerateProductDescriptionOutputSchema},
  model: googleAI.model('gemini-1.5-flash-latest'),
  prompt: `You are an expert e-commerce copywriter.
Your task is to write a compelling, engaging, and SEO-friendly product description.

**Instructions:**
1.  **Analyze the Input**: Use the product name and category to understand the product.
2.  **Write the Description**:
    - Start with a strong opening sentence that grabs attention.
    - Highlight key features and benefits in 2-3 short paragraphs or a bulleted list.
    - Keep the tone enthusiastic and persuasive.
    - The description should be around 50-100 words.
    - Do not invent specific technical specifications unless they are implied by the name (e.g., "Wireless Headphones").
    - Do not include a title or any markdown formatting.

**Product Details:**
- **Product Name**: {{{productName}}}
- **Category**: {{{categoryName}}}

Now, provide the generated description.`,
});

const generateProductDescriptionFlow = ai.defineFlow(
  {
    name: 'generateProductDescriptionFlow',
    inputSchema: GenerateProductDescriptionInputSchema,
    outputSchema: GenerateProductDescriptionOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);
