# JJ's Custom PCs website

This is a plain static website. It does not require Node.js, npm, a build step, or a server backend.

## Preview locally

From this folder, run:

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000/`.

## Deploy

For production, upload the files as-is to the publishing branch of the GitHub Pages repository. Keep `CNAME`, which points GitHub Pages to `jjscustompcs.com`.

For the `/Test/` project site, upload the same files but omit `CNAME`; otherwise GitHub Pages may try to associate the test repository with the production custom domain. All internal assets and links are relative, so the site itself works at both the custom-domain root and a project path such as `/Test/`.

The quote form keeps the production fallback redirect at `https://jjscustompcs.com/thankyou.html`. JavaScript changes that value at runtime to the current GitHub Pages project path when the site is running on `*.github.io`, so a test deployment returns to `/Test/thankyou.html`.
