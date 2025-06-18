
import {genkit, type GenkitPlugin} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

const plugins: GenkitPlugin[] = [];
let modelName: string | undefined = undefined;

// Check for the GOOGLE_API_KEY environment variable.
// The Google AI SDK for JavaScript (used by the plugin) typically requires this.
if (process.env.GOOGLE_API_KEY) {
  plugins.push(googleAI());
  modelName = 'googleai/gemini-2.0-flash';
} else {
  // Log a warning if the API key is not set.
  // This helps in diagnosing issues without causing a hard crash.
  console.warn(
    "GOOGLE_API_KEY environment variable is not set. " +
    "The GoogleAI plugin for Genkit will not be initialized. " +
    "AI features relying on Google AI models may not function correctly. " +
    "Please set the GOOGLE_API_KEY in your .env file if you intend to use Google AI services."
  );
  // modelName remains undefined, Genkit might use a default or flows might fail if they require a specific model.
}

export const ai = genkit({
  plugins,
  // If modelName is undefined, Genkit will either use a default model (if any is configured globally or by another plugin)
  // or flows specifying a model from the googleAI plugin will fail if the plugin isn't loaded.
  model: modelName,
});

