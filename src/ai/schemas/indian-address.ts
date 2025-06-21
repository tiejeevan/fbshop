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
