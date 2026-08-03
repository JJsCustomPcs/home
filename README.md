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

This repository is the production site. Do not publish it as a duplicate GitHub Pages project site. The quote form redirects only to the production confirmation page at `https://jjscustompcs.com/thankyou.html`.

## Validate

Run the dependency-free site checks before publishing:

```sh
python3 scripts/validate_site.py
node --check assets/js/script.js
```
