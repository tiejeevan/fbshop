
'use server';
/**
 * @fileOverview AI flows for generating mock data for the application.
 *
 * - generateMockJobs - Generates a specified number of mock job listings.
 * - generateMockProducts - Generates mock products for a given category.
 * - generateMockCategories - Generates a specified number of new product categories.
 */

import {ai} from '@/ai/genkit';
import {googleAI} from '@genkit-ai/googleai';
import {z} from 'genkit';

// Common Zod schemas for AI output
const MockJobSchema = z.object({
  title: z.string().describe("A realistic but fake job title."),
  description: z.string().describe("A detailed but fake job description (30-60 words)."),
  compensationAmount: z.number().describe("A realistic compensation amount based on the provided range or a random one if no range is given."),
  location: z.string().describe("A fictional, plausible location like 'North Park' or 'Riverside'."),
});

const MockProductSchema = z.object({
  name: z.string().describe("A creative, plausible but fake product name."),
  description: z.string().describe("A compelling but fake product description (40-80 words)."),
  price: z.number().describe("A realistic price for the product, between 10 and 800."),
  stock: z.number().int().describe("A random stock quantity between 5 and 200."),
});

const MockCategorySchema = z.object({
    name: z.string().describe("A plausible e-commerce category name that is not overly generic."),
    description: z.string().describe("A short, fake description for the category (10-20 words)."),
});


// 1. Generate Mock Jobs
const GenerateMockJobsInputSchema = z.object({
  count: z.number().int().min(1).max(20).describe("The number of mock jobs to generate."),
  prompt: z.string().optional().describe("An optional text prompt to guide the theme of the generated jobs."),
  minCompensation: z.number().optional().describe("The minimum compensation for the job."),
  maxCompensation: z.number().optional().describe("The maximum compensation for the job."),
});
export type GenerateMockJobsInput = z.infer<typeof GenerateMockJobsInputSchema>;

const GenerateMockJobsOutputSchema = z.object({
  jobs: z.array(MockJobSchema),
});
export type GenerateMockJobsOutput = z.infer<typeof GenerateMockJobsOutputSchema>;

export async function generateMockJobs(input: GenerateMockJobsInput): Promise<GenerateMockJobsOutput> {
  return generateMockJobsFlow(input);
}

const generateMockJobsFlow = ai.defineFlow(
  {
    name: 'generateMockJobsFlow',
    inputSchema: GenerateMockJobsInputSchema,
    outputSchema: GenerateMockJobsOutputSchema,
  },
  async (input) => {
    const promptText = `You are a mock data generator. Create ${input.count} realistic but clearly fake job postings for a local community help app. Jobs can range from simple tasks like 'watering plants' to more complex ones like 'building a shelf'.

Provide a title, a detailed description, and a fictional location for each job.
{{#if input.prompt}}
The jobs should be based on the following theme or idea: {{{input.prompt}}}
{{/if}}

For compensation:
{{#if input.minCompensation}}
The compensation amount for each job must be between $${input.minCompensation} and $${input.maxCompensation}.
{{else}}
Generate a random compensation amount for each job between $0 and $150.
{{/if}}
`;
    
    const prompt = ai.definePrompt({
      name: 'generateMockJobsPrompt',
      input: {schema: GenerateMockJobsInputSchema},
      output: {schema: GenerateMockJobsOutputSchema},
      model: googleAI.model('gemini-1.5-flash-latest'),
      prompt: promptText,
    });
    const {output} = await prompt({ input }); // Pass the whole input object to the template
    return output!;
  }
);


// 2. Generate Mock Products
const GenerateMockProductsInputSchema = z.object({
  count: z.number().int().min(1).max(20).describe("The number of mock products to generate."),
  categoryName: z.string().describe("The name of the category to generate products for."),
  prompt: z.string().optional().describe("An optional text prompt to guide the theme of the generated products."),
});
export type GenerateMockProductsInput = z.infer<typeof GenerateMockProductsInputSchema>;

const GenerateMockProductsOutputSchema = z.object({
  products: z.array(MockProductSchema),
});
export type GenerateMockProductsOutput = z.infer<typeof GenerateMockProductsOutputSchema>;

export async function generateMockProducts(input: GenerateMockProductsInput): Promise<GenerateMockProductsOutput> {
  return generateMockProductsFlow(input);
}

const generateMockProductsFlow = ai.defineFlow(
  {
    name: 'generateMockProductsFlow',
    inputSchema: GenerateMockProductsInputSchema,
    outputSchema: GenerateMockProductsOutputSchema,
  },
  async (input) => {
    const promptText = `You are a mock data generator. Create ${input.count} realistic but clearly fake product listings. For each, provide a creative name, a compelling description, a realistic price, and a random stock quantity.

All products should belong to the category: "{{input.categoryName}}". This is a mandatory instruction. Do not invent new categories.

{{#if input.prompt}}
The products should be inspired by the following theme: {{{input.prompt}}}
{{/if}}
`;
    const prompt = ai.definePrompt({
      name: 'generateMockProductsPrompt',
      input: {schema: GenerateMockProductsInputSchema},
      output: {schema: GenerateMockProductsOutputSchema},
      model: googleAI.model('gemini-1.5-flash-latest'),
      prompt: promptText,
    });
    const {output} = await prompt({input});
    return output!;
  }
);

// 3. Generate Mock Categories
const GenerateMockCategoriesInputSchema = z.object({
  count: z.number().int().min(1).max(10).describe("The number of mock categories to generate."),
  prompt: z.string().optional().describe("An optional text prompt to guide the theme of the generated categories."),
});
export type GenerateMockCategoriesInput = z.infer<typeof GenerateMockCategoriesInputSchema>;

const GenerateMockCategoriesOutputSchema = z.object({
  categories: z.array(MockCategorySchema),
});
export type GenerateMockCategoriesOutput = z.infer<typeof GenerateMockCategoriesOutputSchema>;

export async function generateMockCategories(input: GenerateMockCategoriesInput): Promise<GenerateMockCategoriesOutput> {
  return generateMockCategoriesFlow(input);
}

const generateMockCategoriesFlow = ai.defineFlow(
  {
    name: 'generateMockCategoriesFlow',
    inputSchema: GenerateMockCategoriesInputSchema,
    outputSchema: GenerateMockCategoriesOutputSchema,
  },
  async (input) => {
    const promptText = `You are a mock data generator. Create ${input.count} unique and plausible e-commerce product categories. Do not use overly generic names like "Electronics" or "Books". Be more specific, like "Vintage Audio Gear" or "Modernist Fiction".

Provide a name and a short description for each category.
{{#if input.prompt}}
The categories should be inspired by the following theme or idea: {{{input.prompt}}}
{{/if}}
`;
    const prompt = ai.definePrompt({
      name: 'generateMockCategoriesPrompt',
      input: {schema: GenerateMockCategoriesInputSchema},
      output: {schema: GenerateMockCategoriesOutputSchema},
      model: googleAI.model('gemini-1.5-flash-latest'),
      prompt: promptText,
    });
    const {output} = await prompt({input});
    return output!;
  }
);
