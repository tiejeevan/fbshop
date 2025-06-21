
import {genkit, type GenkitPlugin} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

const plugins: GenkitPlugin[] = [];

// Check for the GOOGLE_API_KEY environment variable.
// The Google AI SDK for JavaScript (used by the plugin) typically requires this.
if (process.env.GOOGLE_API_KEY) {
  plugins.push(googleAI());
} else {
  // Log a warning if the API key is not set.
  // This helps in diagnosing issues without causing a hard crash.
  console.warn(
    "GOOGLE_API_KEY environment variable is not set. " +
    "The GoogleAI plugin for Genkit will not be initialized. " +
    "AI features relying on Google AI models may not function correctly. " +
    "Please set the GOOGLE_API_KEY in your .env file if you intend to use Google AI services."
  );
}

export const ai = genkit({
  plugins,
});
