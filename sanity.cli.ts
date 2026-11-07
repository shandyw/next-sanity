import { defineCliConfig } from 'sanity/cli';

// CLI defaults for this project's existing production dataset. Use -d to select another dataset.
export default defineCliConfig({
  api: {
    projectId: 'cqr54onh',
    dataset: 'production',
  },
});
