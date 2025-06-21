
import { config } from 'dotenv';
config();

import '@/ai/flows/suggest-product-categories.ts';
import '@/ai/flows/parse-indian-address.ts';
import '@/ai/flows/enhance-job-description.ts';
import '@/ai/flows/generate-product-description.ts';
// Removed: import '@/ai/flows/describe-image-for-search.ts';

