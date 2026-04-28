# WPfrontforbuilderio

Public Builder.io plugin that adds a WordPress-style **New Article** writing workflow with SEO-focused fields.

## Features

- `New Article` main tab inside Builder editor
- WordPress-like writing layout (title, slug, excerpt, body)
- Visual writing controls (style preset, content width, font size, line height)
- SEO fields and readiness score
- Publishing sidebar (status, publish date, featured image, authors, tags)
- Required ALT text for images

## Plugin ID

`builder-new-article-public-plugin`

## Install in Builder via GitHub CDN

1. Push this repo to branch `main`.
2. In Builder: **Space Settings -> Plugins**.
3. Add plugin URL:

```text
https://cdn.jsdelivr.net/gh/janneHalttu/WPfrontforbuilderio@main/dist/plugin.system.js?pluginId=builder-new-article-public-plugin
```

4. Save and reload Builder.
5. Open a `blog-post` style entry and click the `New Article` tab.

## Recommended fields in your Builder Data Model

- `title`, `slug`, `excerpt`, `body`
- `featuredImage`, `featuredImageAlt`
- `publishDate`, `updatedDate`, `status`
- `authors`, `categories`, `tags`
- `seoTitle`, `metaDescription`, `focusKeyword`, `canonicalUrl`
- `robotsIndex`, `robotsFollow`
- `ogTitle`, `ogDescription`, `ogImage`
- `twitterCard`, `twitterTitle`, `twitterDescription`, `twitterImage`
- `defaultLocale`, `availableLocales`
- `stylePreset`, `contentWidth`, `fontSize`, `lineHeight`

## Local test

```bash
python -m http.server 9000
```

Then use:

```text
http://YOUR-IP:9000/dist/plugin.system.js?pluginId=builder-new-article-public-plugin
```
