import { defineField } from 'sanity';
import { validAssociateTag } from '../lib/amazon';
export const amazonSettingsField = defineField({
  name: 'amazonAssociates',
  title: 'Amazon Associates',
  type: 'object',
  fields: [
    defineField({
      name: 'active',
      title: 'Activate Associate links and disclosures',
      type: 'boolean',
      initialValue: false,
      description:
        'Enable only after enrolling with a valid US Associate tag. Final application approval is not required for valid links during the review period. This does not enable API access.',
    }),
    defineField({
      name: 'tag',
      title: 'US Associate tracking ID (public, not a secret)',
      type: 'string',
      description: 'For example, your actual ID ending in -20. Never enter API keys here.',
      validation: (r) =>
        r.custom((value, context) =>
          (context.parent as { active?: boolean })?.active && !validAssociateTag(value)
            ? 'Enter your enrolled US Associate tag ending in -20 before activation.'
            : !value || validAssociateTag(value)
              ? true
              : 'Use a valid US Associate tracking ID ending in -20.',
        ),
    }),
    defineField({
      name: 'clickEventsEnabled',
      title: 'Enable consent-gated outbound click events',
      type: 'boolean',
      initialValue: false,
      description:
        'No analytics provider is installed by this setting. Configure the documented consent adapter and an approved analytics listener before enabling. No visitor-specific Amazon IDs are used.',
    }),
  ],
});
