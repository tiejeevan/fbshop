
'use server';

/**
 * @fileOverview An AI flow to parse unstructured Indian addresses into a structured format.
 * - parseIndianAddress - A function that takes a string and returns a structured address.
 */

import {ai} from '@/ai/genkit';
import {googleAI} from '@genkit-ai/googleai';
import type { IndianAddressInput, IndianAddressOutput } from '@/ai/schemas/indian-address';
import { IndianAddressInputSchema, IndianAddressOutputSchema } from '@/ai/schemas/indian-address';

export async function parseIndianAddress(input: IndianAddressInput): Promise<IndianAddressOutput> {
  return parseIndianAddressFlow(input);
}

const prompt = ai.definePrompt({
  name: 'parseIndianAddressPrompt',
  input: {schema: IndianAddressInputSchema},
  output: {schema: IndianAddressOutputSchema},
  model: googleAI.model('gemini-1.5-flash-latest'),
  prompt: `You are an expert at parsing unstructured Indian addresses. Analyze the following address text and extract the components into the specified JSON format.

  Address to parse:
  "{{input}}"

  - Identify the recipient's name.
  - Extract the street address, including flat number, building, and street. Consolidate this into line1 and line2.
  - Identify the city, state, and the 6-digit PIN code.
  - If a phone number is present, extract it.
  - Set the country to "India".
  - Be precise. If a field is not present in the text, omit it from the output unless it has a default.
  `,
});

const parseIndianAddressFlow = ai.defineFlow(
  {
    name: 'parseIndianAddressFlow',
    inputSchema: IndianAddressInputSchema,
    outputSchema: IndianAddressOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);
