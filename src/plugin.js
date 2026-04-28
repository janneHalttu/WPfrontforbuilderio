(function () {
  var React = window.React;
  var Builder = window.Builder || (window.BuilderSDK && window.BuilderSDK.Builder);
  var appState = window.appState || window.BuilderAppState || {};

  if (!React || !Builder) {
    console.error('WPfront for Builder.io: React or Builder global not found.');
    return;
  }

  var e = React.createElement;
  var useState = React.useState;
  var useEffect = React.useEffect;
  var useMemo = React.useMemo;

  var PLUGIN_ID = 'builder-new-article-public-plugin';
  var TITLE = 'New Article';

  var DEFAULT_FIELDS = {
    title: '',
    slug: '',
    excerpt: '',
    body: '',
    featuredImage: '',
    featuredImageAlt: '',
    publishDate: '',
    updatedDate: '',
    authors: [],
    categories: [],
    tags: [],
    status: 'draft',
    seoTitle: '',
    metaDescription: '',
    focusKeyword: '',
    canonicalUrl: '',
    robotsIndex: true,
    robotsFollow: true,
    ogTitle: '',
    ogDescription: '',
    ogImage: '',
    twitterCard: 'summary_large_image',
    twitterTitle: '',
    twitterDescription: '',
    twitterImage: '',
    defaultLocale: 'fi',
    availableLocales: ['fi'],
    stylePreset: 'wp-classic',
    contentWidth: 760,
    fontSize: 18,
    lineHeight: 1.72
  };

  function safeGet(path, fallback) {
    try {
      var parts = path.split('.');
      var cur = appState;
      for (var i = 0; i < parts.length; i++) {
        if (cur == null) return fallback;
        cur = cur[parts[i]];
      }
      return cur == null ? fallback : cur;
    } catch (err) {
      return fallback;
    }
  }

  function getPluginSettings() {
    try {
      var all = safeGet('user.organization.value.settings.plugins', null);
      if (!all) return {};
      if (typeof all.get === 'function') {
        var entry = all.get(PLUGIN_ID);
        if (entry && typeof entry.toJSON === 'function') return entry.toJSON();
        if (entry && typeof entry === 'object') return entry;
      }
      return all[PLUGIN_ID] || {};
    } catch (err) {
      return {};
    }
  }

  function getEditingContent() {
    return safeGet('designerState.editingContentModel', null) || safeGet('editingContentModel', null) || safeGet('designerState.editingContent', null);
  }

  function getDataStore(content) {
    if (!content) return null;
    return content.data || content;
  }

  function readField(store, key) {
    if (!store) return undefined;
    try {
      if (typeof store.get === 'function') return store.get(key);
    } catch (err) {}
    return store[key];
  }

  function writeField(store, key, value) {
    if (!store) return;
    try {
      if (typeof store.set === 'function') {
        store.set(key, value);
        return;
      }
    } catch (err) {}
    store[key] = value;
  }

  function toArray(value) {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') return value.split(',').map(function (v) { return v.trim(); }).filter(Boolean);
    return [];
  }

  function listToString(value) {
    return toArray(value).join(', ');
  }

  function slugify(text) {
    return String(text || '')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 120);
  }

  function htmlToText(html) {
    var div = document.createElement('div');
    div.innerHTML = html || '';
    return (div.textContent || div.innerText || '').replace(/\s+/g, ' ').trim();
  }

  function countWords(html) {
    var text = htmlToText(html);
    return text ? text.split(/\s+/).filter(Boolean).length : 0;
  }

  function n(value, fallback) {
    var v = Number(value);
    return Number.isFinite(v) ? v : fallback;
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function contains(text, keyword) {
    if (!keyword) return false;
    return String(text || '').toLowerCase().indexOf(String(keyword).toLowerCase()) !== -1;
  }

  function buildSeoScore(fields) {
    var titleLen = String(fields.seoTitle || fields.title || '').trim().length;
    var descLen = String(fields.metaDescription || '').trim().length;
    var kw = String(fields.focusKeyword || '').trim();
    var body = htmlToText(fields.body || '');
    var checks = [
      { label: 'SEO title 35-60 chars', pass: titleLen >= 35 && titleLen <= 60 },
      { label: 'Meta description 120-160 chars', pass: descLen >= 120 && descLen <= 160 },
      { label: 'Focus keyword set', pass: !!kw },
      { label: 'Keyword in title', pass: contains(fields.seoTitle || fields.title, kw) },
      { label: 'Keyword in body', pass: contains(body, kw) },
      { label: 'Canonical URL set', pass: !!String(fields.canonicalUrl || '').trim() },
      { label: 'Social image set', pass: !!String(fields.ogImage || fields.featuredImage || '').trim() },
      { label: 'Featured image ALT set', pass: !!String(fields.featuredImageAlt || '').trim() }
    ];
    var passed = checks.filter(function (x) { return x.pass; }).length;
    return { checks: checks, passed: passed, total: checks.length, percent: Math.round((passed / checks.length) * 100) };
  }

  function getEditorStyle(fields) {
    var preset = fields.stylePreset || 'wp-classic';
    var base = {
      maxWidth: clamp(n(fields.contentWidth, 760), 580, 1000) + 'px',
      margin: '0 auto',
      fontSize: clamp(n(fields.fontSize, 18), 14, 24) + 'px',
      lineHeight: clamp(n(fields.lineHeight, 1.72), 1.3, 2.1)
    };
    if (preset === 'wp-modern') return Object.assign({}, base, { fontFamily: 'Segoe UI, Roboto, Arial, sans-serif', background: '#fff' });
    if (preset === 'wp-magazine') return Object.assign({}, base, { fontFamily: 'Georgia, Times New Roman, serif', background: '#fcfcfd' });
    return Object.assign({}, base, { fontFamily: 'Georgia, Times New Roman, serif', background: '#fff' });
  }

  function getFieldsFromEntry() {
    var content = getEditingContent();
    var store = getDataStore(content);
    var next = {};
    Object.keys(DEFAULT_FIELDS).forEach(function (k) {
      var v = readField(store, k);
      next[k] = v == null ? DEFAULT_FIELDS[k] : v;
    });
    next.authors = toArray(next.authors);
    next.categories = toArray(next.categories);
    next.tags = toArray(next.tags);
    next.availableLocales = toArray(next.availableLocales);
    return next;
  }

  function validateFields(fields) {
    if (!String(fields.title || '').trim()) throw new Error('Title is required.');
    if (!String(fields.slug || '').trim()) throw new Error('Slug is required.');
    if (!htmlToText(fields.body || '')) throw new Error('Article body is required.');
    if (fields.featuredImage && !String(fields.featuredImageAlt || '').trim()) throw new Error('Featured image ALT text is required.');
  }

  function saveToEntry(fields) {
    var content = getEditingContent();
    var store = getDataStore(content);
    if (!content || !store) throw new Error('No Builder entry is currently open.');
    validateFields(fields);
    var payload = Object.assign({}, fields, { updatedDate: new Date().toISOString().slice(0, 10) });
    Object.keys(payload).forEach(function (k) { writeField(store, k, payload[k]); });
    if (payload.title) content.name = payload.title;
    return payload;
  }

  function escapeHtml(v) {
    return String(v || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function escapeAttr(v) {
    return escapeHtml(v).replace(/'/g, '&#39;');
  }

  function command(editor, cmd, value) {
    if (!editor) return;
    editor.focus();
    try { document.execCommand(cmd, false, value || null); } catch (err) {}
  }

  function insertHtml(editor, html) {
    if (!editor) return;
    editor.focus();
    try { document.execCommand('insertHTML', false, html); } catch (err) { editor.innerHTML += html; }
  }

  function Field(props) {
    return e('div', { style: styles.field }, [
      e('label', { key: 'l', style: styles.label }, props.label),
      props.children,
      props.hint ? e('div', { key: 'h', style: styles.hint }, props.hint) : null
    ]);
  }

  function Input(props) { return e('input', Object.assign({}, props, { style: Object.assign({}, styles.input, props.style || {}) })); }
  function Textarea(props) { return e('textarea', Object.assign({}, props, { style: Object.assign({}, styles.textarea, props.style || {}) })); }
  function Select(props) { return e('select', Object.assign({}, props, { style: Object.assign({}, styles.input, props.style || {}) }), props.children); }

  function Toggle(props) {
    return e('label', { style: styles.toggleRow }, [
      e('input', { key: 'c', type: 'checkbox', checked: !!props.checked, onChange: function (evt) { props.onChange(evt.target.checked); } }),
      e('span', { key: 't' }, props.label)
    ]);
  }

  function Toolbar(props) {
    var editor = props.editorRef.current;
    function btn(label, onClick) { return e('button', { key: label, type: 'button', style: styles.toolbarButton, onClick: onClick }, label); }
    return e('div', { style: styles.toolbar }, [
      btn('B', function () { command(editor, 'bold'); }),
      btn('I', function () { command(editor, 'italic'); }),
      btn('H2', function () { command(editor, 'formatBlock', '<h2>'); }),
      btn('H3', function () { command(editor, 'formatBlock', '<h3>'); }),
      btn('List', function () { command(editor, 'insertUnorderedList'); }),
      btn('Quote', function () { command(editor, 'formatBlock', '<blockquote>'); }),
      btn('Link', function () { var url = window.prompt('Link URL'); if (url) command(editor, 'createLink', url); }),
      btn('Image', function () {
        var src = window.prompt('Image URL');
        if (!src) return;
        var alt = window.prompt('ALT text (required)');
        if (!alt || !alt.trim()) { window.alert('ALT text is required.'); return; }
        insertHtml(editor, '<figure><img src="' + escapeAttr(src) + '" alt="' + escapeAttr(alt) + '" /></figure><p></p>');
        props.onChange(editor.innerHTML);
      }),
      btn('Video', function () {
        var url = window.prompt('Video URL');
        if (!url) return;
        insertHtml(editor, '<p><a href="' + escapeAttr(url) + '">' + escapeHtml(url) + '</a></p>');
        props.onChange(editor.innerHTML);
      })
    ]);
  }

  function BodyEditor(props) {
    var editorRef = React.useRef(null);
    useEffect(function () {
      if (editorRef.current && editorRef.current.innerHTML !== (props.value || '')) {
        editorRef.current.innerHTML = props.value || '<p></p>';
      }
    }, [props.value]);

    return e('div', { style: styles.editorWrap }, [
      e(Toolbar, { key: 'tb', editorRef: editorRef, onChange: props.onChange }),
      e('div', {
        key: 'ed',
        ref: editorRef,
        contentEditable: true,
        suppressContentEditableWarning: true,
        style: Object.assign({}, styles.editor, props.editorStyle || null),
        onInput: function (evt) { props.onChange(evt.currentTarget.innerHTML); },
        onBlur: function (evt) { props.onChange(evt.currentTarget.innerHTML); }
      })
    ]);
  }

  function App() {
    var _a = useState(getFieldsFromEntry()), fields = _a[0], setFields = _a[1];
    var _b = useState('editor'), tab = _b[0], setTab = _b[1];
    var _c = useState(''), msg = _c[0], setMsg = _c[1];
    var _d = useState(''), err = _d[0], setErr = _d[1];

    var wordCount = useMemo(function () { return countWords(fields.body); }, [fields.body]);
    var seo = useMemo(function () { return buildSeoScore(fields); }, [fields]);
    var editorStyle = useMemo(function () { return getEditorStyle(fields); }, [fields.stylePreset, fields.contentWidth, fields.fontSize, fields.lineHeight]);

    function update(key, value) { setFields(function (prev) { var next = Object.assign({}, prev); next[key] = value; return next; }); }
    function updateList(key, value) { update(key, toArray(value)); }

    function startNewArticle() {
      var today = new Date().toISOString().slice(0, 10);
      setFields(Object.assign({}, DEFAULT_FIELDS, { body: '<p></p>', publishDate: today, updatedDate: today }));
      setTab('editor');
      setErr('');
      setMsg('Started a fresh New Article draft in this Builder entry.');
    }

    function syncFromEntry() {
      setFields(getFieldsFromEntry());
      setErr('');
      setMsg('Loaded values from the current Builder entry.');
    }

    function save() {
      try {
        var payload = saveToEntry(fields);
        setFields(payload);
        setErr('');
        setMsg('Saved into the current Builder entry. Use Builder Publish when ready.');
      } catch (e2) {
        setMsg('');
        setErr(e2 && e2.message ? e2.message : 'Save failed.');
      }
    }

    function generateSlug() { update('slug', slugify(fields.title)); }

    function pushToCrowdin() {
      var settings = getPluginSettings();
      var endpoint = settings.crowdinPushEndpoint || window.prompt('Crowdin push endpoint', 'https://YOUR-APP/api/builder/crowdin/push');
      if (!endpoint) return;
      try {
        var payload = saveToEntry(fields);
        fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sourceLocale: payload.defaultLocale, availableLocales: payload.availableLocales, article: payload })
        }).then(function (res) {
          if (!res.ok) throw new Error('Crowdin push failed.');
          setErr('');
          setMsg('Article sent to the Crowdin workflow.');
        }).catch(function (e2) {
          setMsg('');
          setErr(e2 && e2.message ? e2.message : 'Crowdin push failed.');
        });
      } catch (e2) {
        setMsg('');
        setErr(e2 && e2.message ? e2.message : 'Crowdin push failed.');
      }
    }

    function addPreset(type) {
      if (type === 'text') { update('body', (fields.body || '') + '<h2>New section</h2><p>Start writing...</p>'); setTab('editor'); return; }
      if (type === 'image') {
        var src = window.prompt('Image URL'); if (!src) return;
        var alt = window.prompt('ALT text (required)'); if (!alt || !alt.trim()) { window.alert('ALT text is required.'); return; }
        update('body', (fields.body || '') + '<figure><img src="' + escapeAttr(src) + '" alt="' + escapeAttr(alt) + '" /></figure><p></p>');
        setTab('editor'); return;
      }
      if (type === 'columns') { update('body', (fields.body || '') + '<table><tbody><tr><td><p>Left column</p></td><td><p>Right column</p></td></tr></tbody></table><p></p>'); setTab('editor'); return; }
      if (type === 'video') { var url = window.prompt('Video URL'); if (!url) return; update('body', (fields.body || '') + '<p><a href="' + escapeAttr(url) + '">' + escapeHtml(url) + '</a></p>'); setTab('editor'); }
    }

    var seoTitle = fields.seoTitle || fields.title || 'Untitled article';
    var seoDescription = fields.metaDescription || fields.excerpt || '';

    return e('div', { style: styles.page }, [
      e('div', { key: 'head', style: styles.header }, [
        e('div', { key: 'left' }, [e('h1', { key: 'h', style: styles.h1 }, TITLE), e('div', { key: 's', style: styles.subtle }, 'WordPress-style article flow inside Builder Data Model entries.')]),
        e('div', { key: 'actions', style: styles.headerActions }, [
          e('button', { key: 'new', type: 'button', style: styles.primaryButton, onClick: startNewArticle }, 'New Article'),
          e('button', { key: 'sync', type: 'button', style: styles.secondaryButton, onClick: syncFromEntry }, 'Reload entry'),
          e('button', { key: 'slug', type: 'button', style: styles.secondaryButton, onClick: generateSlug }, 'Generate slug'),
          e('button', { key: 'crowdin', type: 'button', style: styles.secondaryButton, onClick: pushToCrowdin }, 'Send to Crowdin'),
          e('button', { key: 'save', type: 'button', style: styles.accentButton, onClick: save }, 'Save draft')
        ])
      ]),
      err ? e('div', { key: 'e', style: styles.error }, err) : null,
      msg ? e('div', { key: 'm', style: styles.message }, msg) : null,
      e('div', { key: 'tabs', style: styles.tabs }, [
        tabButton('editor', 'WordPress Layout', tab, setTab),
        tabButton('visual', 'Layout & Style', tab, setTab),
        tabButton('seo', 'SEO', tab, setTab),
        tabButton('localization', 'Localization', tab, setTab),
        tabButton('blocks', 'Blocks', tab, setTab)
      ]),
      e('div', { key: 'layout', style: styles.layout }, [
        e('div', { key: 'main', style: styles.main }, [
          e(Field, { key: 'title', label: 'Title' }, e(Input, { value: fields.title, onChange: function (evt) { update('title', evt.target.value); }, placeholder: 'Main article title' })),
          e(Field, { key: 'slug', label: 'Slug', hint: 'Keep slug short and readable.' }, e(Input, { value: fields.slug, onChange: function (evt) { update('slug', evt.target.value); }, placeholder: 'your-article-slug' })),
          e(Field, { key: 'excerpt', label: 'Excerpt' }, e(Textarea, { rows: 3, value: fields.excerpt, onChange: function (evt) { update('excerpt', evt.target.value); }, placeholder: 'Short summary of the article' })),

          tab === 'editor' ? e(Field, { key: 'body', label: 'Article body', hint: 'Images always require ALT text.' }, e(BodyEditor, { value: fields.body, editorStyle: editorStyle, onChange: function (html) { update('body', html); } })) : null,

          tab === 'visual' ? e('div', { key: 'visual' }, [
            e(Field, { key: 'preset', label: 'Writing style preset' },
              e(Select, { value: fields.stylePreset || 'wp-classic', onChange: function (evt) { update('stylePreset', evt.target.value); } }, [
                e('option', { key: 'classic', value: 'wp-classic' }, 'WP Classic (serif)'),
                e('option', { key: 'modern', value: 'wp-modern' }, 'WP Modern (sans-serif)'),
                e('option', { key: 'mag', value: 'wp-magazine' }, 'Magazine (serif + airy)')
              ])
            ),
            e(Field, { key: 'cw', label: 'Content width (px)' }, e(Input, { type: 'number', min: 580, max: 1000, value: n(fields.contentWidth, 760), onChange: function (evt) { update('contentWidth', clamp(n(evt.target.value, 760), 580, 1000)); } })),
            e(Field, { key: 'fs', label: 'Body font size (px)' }, e(Input, { type: 'number', min: 14, max: 24, value: n(fields.fontSize, 18), onChange: function (evt) { update('fontSize', clamp(n(evt.target.value, 18), 14, 24)); } })),
            e(Field, { key: 'lh', label: 'Line height' }, e(Input, { type: 'number', step: 0.01, min: 1.3, max: 2.1, value: n(fields.lineHeight, 1.72), onChange: function (evt) { update('lineHeight', clamp(n(evt.target.value, 1.72), 1.3, 2.1)); } })),
            e('div', { key: 'vh', style: styles.callout }, 'These settings control the in-editor writing canvas.')
          ]) : null,

          tab === 'seo' ? e('div', { key: 'seo' }, [
            e(Field, { key: 'seot', label: 'SEO title', hint: String((fields.seoTitle || '').length) + ' chars' }, e(Input, { value: fields.seoTitle, onChange: function (evt) { update('seoTitle', evt.target.value); } })),
            e(Field, { key: 'seod', label: 'Meta description', hint: String((fields.metaDescription || '').length) + ' chars' }, e(Textarea, { rows: 4, value: fields.metaDescription, onChange: function (evt) { update('metaDescription', evt.target.value); } })),
            e(Field, { key: 'kw', label: 'Focus keyword' }, e(Input, { value: fields.focusKeyword, onChange: function (evt) { update('focusKeyword', evt.target.value); }, placeholder: 'primary keyword phrase' })),
            e(Field, { key: 'canon', label: 'Canonical URL' }, e(Input, { value: fields.canonicalUrl, onChange: function (evt) { update('canonicalUrl', evt.target.value); }, placeholder: 'https://example.com/blog/slug' })),
            e(Toggle, { key: 'ri', label: 'Robots index', checked: !!fields.robotsIndex, onChange: function (v) { update('robotsIndex', v); } }),
            e(Toggle, { key: 'rf', label: 'Robots follow', checked: !!fields.robotsFollow, onChange: function (v) { update('robotsFollow', v); } }),
            e(Field, { key: 'ogt', label: 'Open Graph title' }, e(Input, { value: fields.ogTitle, onChange: function (evt) { update('ogTitle', evt.target.value); } })),
            e(Field, { key: 'ogd', label: 'Open Graph description' }, e(Textarea, { rows: 3, value: fields.ogDescription, onChange: function (evt) { update('ogDescription', evt.target.value); } })),
            e(Field, { key: 'ogi', label: 'Open Graph image URL' }, e(Input, { value: fields.ogImage, onChange: function (evt) { update('ogImage', evt.target.value); } })),
            e(Field, { key: 'twc', label: 'Twitter card' }, e(Select, { value: fields.twitterCard, onChange: function (evt) { update('twitterCard', evt.target.value); } }, [e('option', { key: 'sum', value: 'summary' }, 'summary'), e('option', { key: 'sumlg', value: 'summary_large_image' }, 'summary_large_image')])),
            e(Field, { key: 'twt', label: 'Twitter title' }, e(Input, { value: fields.twitterTitle, onChange: function (evt) { update('twitterTitle', evt.target.value); } })),
            e(Field, { key: 'twd', label: 'Twitter description' }, e(Textarea, { rows: 3, value: fields.twitterDescription, onChange: function (evt) { update('twitterDescription', evt.target.value); } })),
            e(Field, { key: 'twi', label: 'Twitter image URL' }, e(Input, { value: fields.twitterImage, onChange: function (evt) { update('twitterImage', evt.target.value); } })),
            e('div', { key: 'score', style: styles.seoScorePanel }, [
              e('div', { key: 'sl', style: styles.seoScoreLabel }, 'SEO readiness score'),
              e('div', { key: 'sv', style: styles.seoScoreValue }, String(seo.percent) + '%'),
              e('div', { key: 'sm', style: styles.seoScoreMeta }, String(seo.passed) + '/' + String(seo.total) + ' checks passed'),
              e('div', { key: 'rows', style: styles.seoCheckList }, seo.checks.map(function (item, i) {
                return e('div', { key: String(i), style: styles.seoCheckRow }, [
                  e('span', { key: 'p', style: item.pass ? styles.seoCheckPass : styles.seoCheckFail }, item.pass ? 'PASS' : 'TODO'),
                  e('span', { key: 't', style: styles.seoCheckText }, item.label)
                ]);
              }))
            ])
          ]) : null,

          tab === 'localization' ? e('div', { key: 'loc' }, [
            e(Field, { key: 'dl', label: 'Default locale' }, e(Input, { value: fields.defaultLocale, onChange: function (evt) { update('defaultLocale', evt.target.value); } })),
            e(Field, { key: 'al', label: 'Available locales', hint: 'Comma-separated, example fi, en, sv.' }, e(Input, { value: listToString(fields.availableLocales), onChange: function (evt) { updateList('availableLocales', evt.target.value); } }))
          ]) : null,

          tab === 'blocks' ? e('div', { key: 'blocks', style: styles.blockPanel }, [
            e('div', { key: 'bh', style: styles.callout }, 'Quick content presets'),
            e('div', { key: 'bg', style: styles.blockGrid }, [
              presetCard('Text block', 'Insert a starter text section.', function () { addPreset('text'); }),
              presetCard('Image block', 'Prompt for URL + required ALT text.', function () { addPreset('image'); }),
              presetCard('Columns', 'Insert a simple 2-column table.', function () { addPreset('columns'); }),
              presetCard('Video', 'Insert linked video URL.', function () { addPreset('video'); })
            ])
          ]) : null
        ]),

        e('aside', { key: 'side', style: styles.sidebar }, [
          e('h2', { key: 'h', style: styles.h2 }, 'Publishing'),
          e(Field, { key: 'status', label: 'Status' }, e(Select, { value: fields.status, onChange: function (evt) { update('status', evt.target.value); } }, [e('option', { key: 'd', value: 'draft' }, 'draft'), e('option', { key: 'r', value: 'review' }, 'review'), e('option', { key: 's', value: 'scheduled' }, 'scheduled'), e('option', { key: 'p', value: 'published' }, 'published')])),
          e(Field, { key: 'pd', label: 'Publish date' }, e(Input, { type: 'date', value: fields.publishDate, onChange: function (evt) { update('publishDate', evt.target.value); } })),
          e(Field, { key: 'fi', label: 'Featured image URL' }, e(Input, { value: fields.featuredImage, onChange: function (evt) { update('featuredImage', evt.target.value); }, placeholder: 'https://...' })),
          e(Field, { key: 'fa', label: 'Featured image ALT', hint: 'Required whenever featured image is used.' }, e(Input, { value: fields.featuredImageAlt, onChange: function (evt) { update('featuredImageAlt', evt.target.value); }, placeholder: 'Describe the image clearly' })),
          e(Field, { key: 'au', label: 'Authors' }, e(Input, { value: listToString(fields.authors), onChange: function (evt) { updateList('authors', evt.target.value); }, placeholder: 'Author A, Author B' })),
          e(Field, { key: 'ca', label: 'Categories' }, e(Input, { value: listToString(fields.categories), onChange: function (evt) { updateList('categories', evt.target.value); }, placeholder: 'News, Guides' })),
          e(Field, { key: 'ta', label: 'Tags' }, e(Input, { value: listToString(fields.tags), onChange: function (evt) { updateList('tags', evt.target.value); }, placeholder: 'builder, seo' })),
          e('div', { key: 'stats', style: styles.stats }, [
            statRow('Words', String(wordCount)),
            statRow('SEO title', String((fields.seoTitle || '').length)),
            statRow('Meta description', String((fields.metaDescription || '').length)),
            statRow('SEO score', String(seo.percent) + '%')
          ]),
          e('div', { key: 'preview', style: styles.preview }, [
            e('div', { key: 'pl', style: styles.previewLabel }, 'SEO preview'),
            e('div', { key: 'pt', style: styles.previewTitle }, seoTitle),
            e('div', { key: 'pu', style: styles.previewUrl }, fields.canonicalUrl || ('/' + fields.defaultLocale + '/blog/' + (fields.slug || 'your-slug'))),
            e('div', { key: 'pd', style: styles.previewDesc }, seoDescription)
          ])
        ])
      ])
    ]);
  }

  function tabButton(value, label, activeTab, setActiveTab) {
    return e('button', {
      key: value,
      type: 'button',
      onClick: function () { setActiveTab(value); },
      style: Object.assign({}, styles.tabButton, activeTab === value ? styles.tabButtonActive : null)
    }, label);
  }

  function presetCard(title, description, action) {
    return e('div', { key: title, style: styles.blockCard }, [
      e('div', { key: 't', style: styles.blockTitle }, title),
      e('div', { key: 'd', style: styles.blockDesc }, description),
      e('button', { key: 'b', type: 'button', style: styles.secondaryButton, onClick: action }, 'Insert')
    ]);
  }

  function statRow(label, value) {
    return e('div', { key: label, style: styles.statRow }, [
      e('span', { key: 'l', style: styles.statLabel }, label),
      e('span', { key: 'v', style: styles.statValue }, value)
    ]);
  }

  Builder.register('plugin', {
    id: PLUGIN_ID,
    name: 'WPfront for Builder.io',
    settings: [
      { name: 'allowedModels', type: 'string', helperText: 'Comma-separated model names. Default recommendation: blog-post' },
      { name: 'crowdinPushEndpoint', type: 'string', helperText: 'Optional backend endpoint for translation workflow push.' }
    ]
  });

  Builder.register('editor.mainTab', {
    name: TITLE,
    component: function () { return e(App); }
  });

  Builder.register('editor.header', {
    component: function () {
      return e('div', { style: styles.headerBanner }, 'WPfront for Builder.io: click New Article, write in WordPress style, then publish with Builder.');
    }
  });

  var styles = {
    page: { fontFamily: 'Inter, Arial, sans-serif', background: '#f8fafc', color: '#0f172a', minHeight: '100%', padding: 20 },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 16 },
    headerBanner: { width: '100%', padding: '10px 14px', background: '#eff6ff', color: '#1d4ed8', borderBottom: '1px solid #bfdbfe', fontSize: 12, fontWeight: 700 },
    headerActions: { display: 'flex', gap: 10, flexWrap: 'wrap' },
    h1: { margin: 0, fontSize: 28, lineHeight: 1.15 },
    h2: { margin: '0 0 12px', fontSize: 16 },
    subtle: { marginTop: 6, fontSize: 13, color: '#475569' },
    tabs: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 },
    tabButton: { border: '1px solid #cbd5e1', background: '#fff', color: '#334155', borderRadius: 999, padding: '8px 14px', fontWeight: 600, cursor: 'pointer' },
    tabButtonActive: { background: '#111827', color: '#fff', borderColor: '#111827' },
    layout: { display: 'grid', gridTemplateColumns: 'minmax(0, 1.7fr) minmax(320px, 0.85fr)', gap: 20, alignItems: 'start' },
    main: { background: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 8px 24px rgba(15,23,42,0.07)' },
    sidebar: { background: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 8px 24px rgba(15,23,42,0.07)' },
    field: { marginBottom: 16 },
    label: { display: 'block', fontWeight: 700, fontSize: 13, marginBottom: 8 },
    hint: { marginTop: 6, color: '#64748b', fontSize: 12 },
    input: { width: '100%', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: 10, padding: '10px 12px', fontSize: 14, background: '#fff' },
    textarea: { width: '100%', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: 10, padding: '10px 12px', fontSize: 14, lineHeight: 1.5, fontFamily: 'inherit', resize: 'vertical' },
    primaryButton: { border: 'none', borderRadius: 999, background: '#0f172a', color: '#fff', padding: '10px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
    secondaryButton: { border: '1px solid #cbd5e1', borderRadius: 999, background: '#fff', color: '#0f172a', padding: '10px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
    accentButton: { border: 'none', borderRadius: 999, background: '#b91c1c', color: '#fff', padding: '10px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
    toolbar: { display: 'flex', gap: 8, flexWrap: 'wrap', padding: 10, borderBottom: '1px solid #e2e8f0', background: '#f8fafc' },
    toolbarButton: { border: '1px solid #cbd5e1', background: '#fff', borderRadius: 8, padding: '6px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer' },
    editorWrap: { border: '1px solid #cbd5e1', borderRadius: 14, overflow: 'hidden', background: '#fff' },
    editor: { minHeight: 420, padding: 18, outline: 'none' },
    toggleRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, fontSize: 14 },
    blockPanel: { display: 'grid', gap: 16 },
    blockGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 },
    blockCard: { border: '1px solid #e2e8f0', borderRadius: 14, padding: 14, background: '#fff' },
    blockTitle: { fontWeight: 700, marginBottom: 6 },
    blockDesc: { color: '#475569', fontSize: 13, lineHeight: 1.5, marginBottom: 12 },
    stats: { marginTop: 12, borderTop: '1px solid #e2e8f0', paddingTop: 12 },
    statRow: { display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 8, fontSize: 13 },
    statLabel: { color: '#64748b' },
    statValue: { fontWeight: 700 },
    preview: { marginTop: 18, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 14 },
    previewLabel: { fontSize: 12, color: '#64748b', fontWeight: 700, marginBottom: 6 },
    previewTitle: { color: '#1d4ed8', fontSize: 18, lineHeight: 1.3, marginBottom: 4 },
    previewUrl: { color: '#15803d', fontSize: 12, marginBottom: 6, wordBreak: 'break-all' },
    previewDesc: { color: '#475569', fontSize: 13, lineHeight: 1.5 },
    message: { background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', padding: '10px 12px', borderRadius: 10, marginBottom: 16 },
    error: { background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', padding: '10px 12px', borderRadius: 10, marginBottom: 16 },
    callout: { background: '#f8fafc', color: '#334155', border: '1px solid #e2e8f0', padding: '12px 14px', borderRadius: 12 },
    seoScorePanel: { marginTop: 10, border: '1px solid #fde68a', background: '#fffbeb', borderRadius: 12, padding: 12 },
    seoScoreLabel: { fontSize: 12, fontWeight: 700, color: '#92400e', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.3 },
    seoScoreValue: { fontSize: 30, lineHeight: 1, color: '#7c2d12', fontWeight: 800, marginBottom: 4 },
    seoScoreMeta: { fontSize: 12, color: '#9a3412', marginBottom: 10 },
    seoCheckList: { display: 'grid', gap: 6 },
    seoCheckRow: { display: 'grid', gridTemplateColumns: '56px minmax(0, 1fr)', alignItems: 'center', gap: 8 },
    seoCheckPass: { display: 'inline-block', borderRadius: 999, background: '#dcfce7', color: '#166534', fontSize: 11, fontWeight: 700, textAlign: 'center', padding: '3px 6px' },
    seoCheckFail: { display: 'inline-block', borderRadius: 999, background: '#fee2e2', color: '#991b1b', fontSize: 11, fontWeight: 700, textAlign: 'center', padding: '3px 6px' },
    seoCheckText: { fontSize: 12, color: '#334155' }
  };
})();