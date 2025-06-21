'use server';

/**
 * @fileOverview An AI-powered tool to parse unstructured Indian addresses into a structured format.
 *
 * - parseIndianAddress - A function that handles the address parsing.
 * - ParseIndianAddressInput - The input type for the function.
 * - ParseIndianAddressOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ParseIndianAddressInputSchema = z.object({
  unstructuredAddress: z.string().describe('A single string containing a full Indian address, possibly with line breaks.'),
});
export type ParseIndianAddressInput = z.infer<typeof ParseIndianAddressInputSchema>;

const ParseIndianAddressOutputSchema = z.object({
  recipientName: z.string().optional().describe('The name of the person or company receiving the package.'),
  addressLine1: z.string().describe('The primary address line, including flat/house number, building name, and street.'),
  addressLine2: z.string().optional().describe('An additional address line for area, locality, or landmark.'),
  city: z.string().describe('The city or town name.'),
  state: z.string().describe('The full name of the state (e.g., "MH" becomes "Maharashtra").'),
  postalCode: z.string().describe('The 6-digit postal code (PIN code).'),
  phoneNumber: z.string().optional().describe('A contact phone number, if found in the address.'),
});
export type ParseIndianAddressOutput = z.infer<typeof ParseIndianAddressOutputSchema>;

export async function parseIndianAddress(input: ParseIndianAddressInput): Promise<ParseIndianAddressOutput> {
  return parseIndianAddressFlow(input);
}

const prompt = ai.definePrompt({
  name: 'parseIndianAddressPrompt',
  input: {schema: ParseIndianAddressInputSchema},
  output: {schema: ParseIndianAddressOutputSchema},
  prompt: `You are an expert logistics processor specializing in Indian addresses. Your task is to parse an unstructured address string into a structured JSON format.

The user will provide a block of text representing an address. Extract the following fields: recipientName, addressLine1, addressLine2, city, state, and postalCode.

- If a recipient name is not obvious, leave it empty.
- Combine the house/flat number, building, and street into \`addressLine1\`.
- Use \`addressLine2\` for any additional landmark or area details.
- Standardize the state name to its full form (e.g., "MH" becomes "Maharashtra").
- The postal code must be a 6-digit number.
- Extract a phone number if one is present.

Address to parse:
{{{unstructuredAddress}}}`,
});

const parseIndianAddressFlow = ai.defineFlow(
  {
    name: 'parseIndianAddressFlow',
    inputSchema: ParseIndianAddressInputSchema,
    outputSchema: ParseIndianAddressOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
