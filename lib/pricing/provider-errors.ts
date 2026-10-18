import { PricingError } from './security';

/** Use fixed messages: provider errors may contain submitted data or credentials. */
export function pricingProviderError(error: unknown): PricingError {
  if (error instanceof PricingError) return error;
  const details =
    error && typeof error === 'object'
      ? (error as { status?: number; code?: string; name?: string })
      : {};
  if (details.code === 'insufficient_quota')
    return new PricingError(
      402,
      'OpenAI API billing has no available quota. Check billing and credits for the API key’s project at platform.openai.com/settings/organization/billing/overview. ChatGPT subscriptions do not supply API credits. No asking price was changed.',
    );
  if (details.status === 401)
    return new PricingError(
      503,
      'OpenAI rejected OPENAI_API_KEY. Create or verify the API key in your OpenAI project, update the server environment, and restart the server.',
    );
  if (details.status === 403)
    return new PricingError(
      503,
      'The OpenAI project or API key cannot access this assessment. Check model access and the key’s Responses API permissions.',
    );
  if (details.status === 404)
    return new PricingError(
      503,
      'PRICING_AI_MODEL is unavailable to this OpenAI project. Check the exact model name and your project’s model access, then restart the server.',
    );
  if (details.status === 429)
    return new PricingError(
      429,
      'OpenAI’s API rate limit was reached. Wait before retrying and check the project’s API limits. No asking price was changed.',
    );
  if (details.name === 'APIConnectionTimeoutError' || details.status === 408)
    return new PricingError(
      504,
      'The OpenAI assessment timed out. Please retry later. No asking price was changed.',
    );
  if (details.name === 'APIConnectionError')
    return new PricingError(
      502,
      'The server could not connect to OpenAI. Check its network and certificate configuration. No asking price was changed.',
    );
  if (details.code === 'invalid_json_schema')
    return new PricingError(
      502,
      'OpenAI rejected the structured assessment schema. The pricing integration needs a schema compatibility fix; no asking price was changed.',
    );
  if (details.status === 400)
    return new PricingError(
      502,
      'OpenAI rejected the assessment request. Verify that PRICING_AI_MODEL supports image inputs and Structured Outputs, and that the item images are accessible. No asking price was changed.',
    );
  return new PricingError(
    502,
    'OpenAI could not return a valid assessment. Please retry later. No asking price was changed.',
  );
}
