# Shared hero image pool

Drop owned or authorized JPG, JPEG, PNG, WebP or AVIF photographs directly in this folder. Subfolders, symlinks and other file types are ignored. Use portrait photographs with enough room around the subject for portrait crops around 3:5 (outfit) and 3:5.7 (detail). Files here are public assets and are included in deployment.

The folder is seeded with copies of the existing project photographs `me2.jpg` and `mirror.jpg`; replace or add photographs as desired. Originals elsewhere in `public/img` are unchanged. These mood photographs are decorative, with empty alt text; they do not represent the product or review being displayed.

The server randomly chooses two different files for each page identity and caches the pair for five minutes. Selection happens before HTML is sent, so there is no hydration mismatch, image swap or JavaScript requirement. Filter/query changes keep the same page identity. Cached/static pages can keep their pair until their next regeneration. With one file both photo slots use it; with no photographs the photo slots show a neutral placeholder.

After adding files, allow five minutes for the image-pair cache to refresh locally; restart development if necessary. In production, deploy the updated folder. No Sanity write token or third-party image service is needed. Published homepage photo overrides in Sanity still take precedence over the pool.
