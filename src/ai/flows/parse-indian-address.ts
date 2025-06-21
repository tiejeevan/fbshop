
'use server';

/**
 * @fileOverview An AI flow to parse unstructured Indian addresses into a structured format.
 * - parseIndianAddress - A function that takes a string and returns a structured address.
 * - IndianAddressInput - Input schema for the flow.
 * - IndianAddressOutput - Output schema for the flow.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

export const IndianAddressInputSchema = z.string().describe('An unstructured address string from India.');
export type IndianAddressInput = z.infer<typeof IndianAddressInputSchema>;

export const IndianAddressOutputSchema = z.object({
  name: z.string().optional().describe("The recipient's name, if present in the address."),
  line1: z.string().describe('The primary address line, including flat/house number and street name.'),
  line2: z.string().optional().describe('The secondary address line, including area or landmark.'),
  city: z.string().describe('The city name.'),
  state: z.string().describe('The state name.'),
  postalCode: z.string().describe('The 6-digit postal code (PIN code).'),
  country: z.string().default('India').describe('The country.'),
  phoneNumber: z.string().optional().describe("The recipient's phone number, if present."),
});
export type IndianAddressOutput = z.infer<typeof IndianAddressOutputSchema>;

export async function parseIndianAddress(input: IndianAddressInput): Promise<IndianAddressOutput> {
  return parseIndianAddressFlow(input);
}

const prompt = ai.definePrompt({
  name: 'parseIndianAddressPrompt',
  input: {schema: IndianAddressInputSchema},
  output: {schema: IndianAddressOutputSchema},
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
