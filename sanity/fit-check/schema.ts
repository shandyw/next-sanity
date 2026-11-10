import { defineArrayMember, defineField, defineType } from 'sanity';

const detail = (name: string, title: string) => defineField({ name, title, type: 'string' });
const shandy = (parent: { parent?: { testedBy?: string } }) =>
  !['shandy', 'both'].includes(parent.parent?.testedBy || '');
const mannequin = (parent: { parent?: { testedBy?: string } }) =>
  !['shannequin', 'both'].includes(parent.parent?.testedBy || '');

export const fitCheck = defineType({
  name: 'fitCheck',
  title: 'Shannequin Fit Check',
  type: 'object',
  fields: [
    defineField({
      name: 'enabled',
      title: 'Enable Fit Check',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({
      name: 'testedBy',
      title: 'Tested by',
      type: 'string',
      hidden: ({ parent }) => !parent?.enabled,
      options: {
        list: [
          { title: 'Shandy', value: 'shandy' },
          { title: 'Shannequin', value: 'shannequin' },
          { title: 'Both', value: 'both' },
        ],
      },
    }),
    defineField({
      name: 'shandy',
      title: 'On Shandy',
      type: 'object',
      hidden: ({ parent }) => !parent?.enabled || shandy({ parent }),
      fields: [
        defineField({
          name: 'overallFit',
          title: 'Overall fit',
          type: 'string',
          options: {
            list: [
              { title: 'True to size', value: 'trueToSize' },
              { title: 'Runs small', value: 'runsSmall' },
              { title: 'Runs large', value: 'runsLarge' },
              { title: 'Mixed fit', value: 'mixed' },
            ],
          },
        }),
        defineField({
          name: 'stretchRating',
          title: 'Stretch rating (1–5)',
          type: 'number',
          validation: (r) => r.integer().min(1).max(5),
        }),
        detail('bustFit', 'Bust fit'),
        detail('waistFit', 'Waist fit'),
        detail('hipFit', 'Hip fit'),
        detail('length', 'Length'),
        detail('sittingComfort', 'Sitting comfort'),
        detail('movementComfort', 'Movement / comfort'),
        detail('undergarments', 'Bra / undergarments'),
        defineField({ name: 'notes', title: 'Additional fit notes', type: 'text' }),
      ],
    }),
    defineField({
      name: 'shannequin',
      title: 'On Shannequin (visual only)',
      type: 'object',
      hidden: ({ parent }) => !parent?.enabled || mannequin({ parent }),
      fields: [
        detail('sizeDisplayed', 'Size displayed'),
        defineField({
          name: 'visualFit',
          title: 'Visual fit',
          type: 'string',
          options: {
            list: [
              { title: 'True to size visually', value: 'trueToSize' },
              { title: 'Appears snug', value: 'snug' },
              { title: 'Appears loose', value: 'loose' },
              { title: 'Mixed visual fit', value: 'mixed' },
            ],
          },
        }),
        detail('bustFit', 'Bust fit'),
        detail('waistFit', 'Waist fit'),
        detail('hipFit', 'Hip fit'),
        detail('garmentLength', 'Garment length'),
        detail('drape', 'Drape and silhouette'),
        defineField({ name: 'notes', title: 'Additional visual observations', type: 'text' }),
      ],
    }),
    defineField({
      name: 'highlights',
      title: 'Fit highlights',
      type: 'array',
      of: [defineArrayMember({ type: 'string' })],
      options: {
        list: [
          { title: 'Generous hip room', value: 'generousHipRoom' },
          { title: 'Snug waistband', value: 'snugWaistband' },
          { title: 'Bust-friendly', value: 'bustFriendly' },
          { title: 'Limited bust room', value: 'limitedBustRoom' },
          { title: 'Bra-friendly', value: 'braFriendly' },
          { title: 'Shapewear optional', value: 'shapewearOptional' },
          { title: 'Stretchy fabric', value: 'stretchyFabric' },
          { title: 'Minimal stretch', value: 'minimalStretch' },
          { title: 'Longer length', value: 'longerLength' },
          { title: 'Shorter length', value: 'shorterLength' },
          { title: 'Adjustable fit', value: 'adjustableFit' },
        ],
      },
    }),
  ],
});
