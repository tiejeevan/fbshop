
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
  prompt: `You are an expert at parsing unstructured Indian addresses into a structured JSON format.
Analyze the following address text. Be precise. If a field is not present, omit it from the output unless it has a default.

**Address to parse:**
\`\`\`
{{input}}
\`\`\`

**Instructions:**
- **recipientName**: Identify the person's name.
- **line1**: Extract the primary address line. This usually includes the flat/house/door number, building name, and street name.
- **line2**: Extract the secondary address line, which typically includes the locality, area, or a nearby landmark.
- **city**: Identify the city name.
- **state**: Identify the state or union territory.
- **postalCode**: Find the 6-digit PIN code. This is crucial.
- **country**: This should always be "India".
- **phoneNumber**: Extract any 10-digit mobile number found in the address.

**Example 1:**
Input: "Anil Kumar, Flat 201, Green View Apartments, 12th Main Road, Indiranagar, Bangalore, Karnataka, 560038, Ph: 9876543210"
Output should be:
{
  "name": "Anil Kumar",
  "line1": "Flat 201, Green View Apartments, 12th Main Road",
  "line2": "Indiranagar",
  "city": "Bangalore",
  "state": "Karnataka",
  "postalCode": "560038",
  "country": "India",
  "phoneNumber": "9876543210"
}

**Example 2:**
Input: "Priya Singh C/O Rajesh Singh H.No. 55, Sector 15, Gurgaon - 122001 Haryana"
Output should be:
{
  "name": "Priya Singh",
  "line1": "C/O Rajesh Singh H.No. 55",
  "line2": "Sector 15",
  "city": "Gurgaon",
  "state": "Haryana",
  "postalCode": "122001",
  "country": "India"
}

Now, parse the provided address.`,
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
