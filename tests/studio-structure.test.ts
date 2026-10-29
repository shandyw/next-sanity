import test from 'node:test';
import assert from 'node:assert/strict';
import config from '../sanity.config';

type Entry = {
  kind: string;
  label?: string;
  children?: Entry[];
  childEntry?: Entry;
  filterValue?: string;
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

test('Studio focuses on Reviews, Looks, Finds, and website settings', () => {
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
    ['Content', 'Amazon Finds', 'Website'],
  );
  assert.deepEqual(
    root.children?.[0].childEntry?.children?.map((item) => item.label),
    ['Reviews', 'Shop the Looks', 'Blog Posts'],
  );
  assert.equal(root.children?.[1].childEntry?.children?.[0].label, 'Quick Add Find');
  assert.ok(
    root.children?.[1].childEntry?.children?.some((item) => item.label === 'Needs Attention'),
  );
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
