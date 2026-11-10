import test from 'node:test';
import assert from 'node:assert/strict';
import config from '../sanity.config';

type Entry = {
  kind: string;
  label?: string;
  children?: Entry[];
  childEntry?: Entry;
  filterValue?: string;
  defaultOrder?: { field: string; direction: string }[];
};

function builder(kind: string): Entry & Record<string, unknown> {
  const entry: Entry = { kind };
  return Object.assign(entry, {
    title(label: string) {
      entry.label = label;
      return this;
    },
    items(children: Entry[]) {
      entry.children = children;
      return this;
    },
    child(childEntry: Entry) {
      entry.childEntry = childEntry;
      return this;
    },
    filter(filterValue: string) {
      entry.filterValue = filterValue;
      return this;
    },
    defaultOrdering(order: { field: string; direction: string }[]) {
      entry.defaultOrder = order;
      return this;
    },
    schemaType() {
      return this;
    },
    documentId() {
      return this;
    },
    initialValueTemplates() {
      return this;
    },
  });
}

test('Studio keeps editorial content, Finds, AI models, and website settings organized', () => {
  const studio = config as unknown as {
    tools?: { title: string }[];
    plugins: { name?: string; tools?: { options?: { structure?: (S: unknown) => Entry } }[] }[];
    schema: {
      templates: (items: { schemaType: string }[]) => { id: string; schemaType: string }[];
    };
  };
  const structure = studio.plugins.find((plugin) => plugin.name === 'sanity/structure')?.tools?.[0]
    .options?.structure;
  assert.ok(structure);
  const S = {
    list: () => builder('list'),
    listItem: () => builder('item'),
    documentTypeListItem: (type: string) => builder(`type:${type}`),
    documentTypeList: (type: string) => builder(`filtered:${type}`),
    document: () => builder('document'),
    divider: () => builder('divider'),
    initialValueTemplateItem: (name: string) => builder(`template:${name}`),
  };
  const root = structure(S);
  assert.deepEqual(
    root.children?.map((item) => item.label),
    ['Content', 'Amazon Finds', 'AI Studio', 'Website'],
  );
  assert.deepEqual(
    root.children?.[0].childEntry?.children?.map((item) => item.label),
    ['Reviews', 'Shop the Looks', 'Blog Posts'],
  );
  assert.equal(root.children?.[1].childEntry?.children?.[0].label, 'Quick Add Find');
  assert.ok(
    root.children?.[1].childEntry?.children?.some((item) => item.label === 'Needs Attention'),
  );
  const findLists = root.children?.[1].childEntry?.children;
  assert.equal(
    findLists?.find((item) => item.label === 'Finds Needing Attention')?.childEntry?.filterValue,
    '_type == "find" && linkStatus == "needsReview"',
  );
  assert.equal(
    findLists?.find((item) => item.label === 'Manually Unavailable Finds')?.childEntry?.filterValue,
    '_type == "find" && linkStatus == "unavailable"',
  );
  const aiStudio = root.children?.[2].childEntry?.children;
  assert.deepEqual(
    aiStudio?.map((item) => item.label),
    ['Fashion Models', 'Active Models', 'Inactive Models'],
  );
  assert.equal(aiStudio?.[0].kind, 'type:aiFashionModel');
  assert.equal(
    aiStudio?.[1].childEntry?.filterValue,
    '_type == "aiFashionModel" && active == true',
  );
  assert.equal(
    aiStudio?.[2].childEntry?.filterValue,
    '_type == "aiFashionModel" && active == false',
  );
  const website = root.children?.find((item) => item.label === 'Website')?.childEntry;
  const categories = website?.children?.find((item) => item.label === 'Clothing categories');
  assert.deepEqual(categories?.childEntry?.defaultOrder, [{ field: 'title', direction: 'asc' }]);
  assert.deepEqual(
    studio.schema.templates([]).find((item) => item.id === 'quick-add-find'),
    {
      id: 'quick-add-find',
      title: 'Quick Add Find',
      schemaType: 'find',
      value: { experienceStatus: 'notTested' },
    },
  );
  assert.equal(studio.tools?.length || 0, 0);
});
