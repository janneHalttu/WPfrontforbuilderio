# WPfrontforbuilderio

Public Builder.io plugin that adds a WordPress-style **New Article** writing workflow with SEO-focused fields.

## Dashboard Preview

![WPfrontforbuilderio dashboard preview](docs/dashboard-render.svg)

This preview shows the target WordPress-style writing layout, SEO panel, visual settings, and publishing sidebar.

## Features

- `New Article` main tab inside Builder editor
- WordPress-like writing layout (title, slug, excerpt, body)
- Visual writing controls (style preset, content width, font size, line height)
- SEO fields and readiness score
- Publishing sidebar (status, publish date, featured image, authors, tags)
- Required ALT text for images

## Plugin ID

`builder-new-article-public-plugin`

## Builder install values (copy/paste)

Use these exact values in Builder plugin setup forms.

### If the field says `NPM Package name`

```text
wpfrontforbuilderio@1.1.0
```

You can also use latest:

```text
wpfrontforbuilderio
```

### If the field says `Plugin URL`

Recommended (npm CDN, pinned version):

```text
https://cdn.jsdelivr.net/npm/wpfrontforbuilderio@1.1.0/dist/plugin.system.js?pluginId=builder-new-article-public-plugin
```

Alternative (GitHub CDN):

```text
https://cdn.jsdelivr.net/gh/janneHalttu/WPfrontforbuilderio@main/dist/plugin.system.js?pluginId=builder-new-article-public-plugin
```

Note: do **not** use the GitHub repo clone URL (`.git`) in Builder plugin fields.

## Publish to npm

From your local clone of this repository:

```bash
npm adduser
npm publish --access public
```

If npm returns `E403` with 2FA requirement, publish with a granular token that has write access and bypass 2FA enabled.

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