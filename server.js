const express = require('express');
const path = require('path');
const fs = require('fs');
const { marked } = require('marked');
const katex = require('katex');
const markedKatex = require('marked-katex-extension');

// ─── Gallery exhibits ───
// In a post, write:
//
//   ```exhibit
//   <the piece, pasted as-is: model output, poem, anything>
//   ---
//   Title of the work
//   any number of label lines
//   ```
//
// The piece renders as a framed block and the lines after the last `---`
// render as a museum-style wall label (first line is the title).
const escHtml = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
marked.use({
  renderer: {
    // links that leave the site open in a new tab
    link({ href, title, tokens }) {
      if (!/^https?:\/\//.test(href)) return false;
      const text = this.parser.parseInline(tokens);
      const t = title ? ` title="${escHtml(title)}"` : '';
      return `<a href="${href}"${t} target="_blank" rel="noopener">${text}</a>`;
    },
    code({ text, lang }) {
      if (lang !== 'exhibit') return false; // every other fence renders normally
      const lines = text.split('\n');
      const cut = lines.lastIndexOf('---');
      const piece = (cut === -1 ? lines : lines.slice(0, cut)).join('\n').trim();
      const label = cut === -1 ? [] : lines.slice(cut + 1).map(l => l.trim()).filter(Boolean);
      const [title, ...rest] = label.map(escHtml);
      const caption = title
        ? `<figcaption class="exhibit-label"><strong>${title}</strong>${rest.map(l => `<span>${l}</span>`).join('')}</figcaption>`
        : '';
      const body = escHtml(piece)
        .replace(/&lt;\|[^|\n]*\|&gt;/g, m => `<span class="exhibit-token">${m}</span>`) // <|endoftext|> etc.
        .replace(/\[(?:\.\.\.|…)\]/g, m => `<span class="exhibit-elide">${m}</span>`);     // [...] cuts
      const paras = body.split('\n').filter(l => l.trim()).map(l => `<p>${l}</p>`).join('');
      return `<figure class="exhibit"><div class="exhibit-piece">${paras}</div>${caption}</figure>\n`;
    },
  },
});

// ─── Math (KaTeX, rendered server-side) ───
//   inline:   $a^2 + b^2 = c^2$
//   display:  $$ ... $$  on their own lines
//   or a bare environment starting a line, no dollars needed:
//     \begin{align*}
//       \gcd(a, b) &= \gcd(b, a \bmod b) \\
//                  &= \cdots
//     \end{align*}
// Inline $ follows Pandoc's rule: no space just inside either $, and a closing $ can't be followed
// by a digit. So ($n = 1$) works, while "costs $5 and $10" stays plain text. \$ is a literal dollar.
// A \newcommand anywhere in a post works for the rest of that post; macros reset per render.
const inlineMathRule = /^(\${1,2})(?!\$)(?=\S)((?:\\.|[^\\\n$])+?)(?<!\s)\1(?!\d)/;
const baseMacros = {
  '\\N': '\\mathbb{N}', '\\Z': '\\mathbb{Z}', '\\Q': '\\mathbb{Q}', '\\R': '\\mathbb{R}', '\\C': '\\mathbb{C}',
};
const katexMacros = {};
const katexOpts = { throwOnError: false, macros: katexMacros, globalGroup: true };

// ─── Theorem-style blocks (amsthm-ish). Their insides are regular markdown, math included:
//     \begin{theorem}[Bézout]          <- optional [title], may contain $math$
//     For $a, b \in \Z$ there are $x, y$ with $ax + by = \gcd(a, b)$.
//     \end{theorem}
//
//     \begin{proof}
//     Run Euclid backwards...
//     \end{proof}                      <- ends with a ∎; [Proof of X] renames it
// theorem/lemma/proposition/corollary/definition share one counter per post; add * (theorem*) to skip numbering.
const THM_ENVS = {
  theorem: 'Theorem', lemma: 'Lemma', proposition: 'Proposition', corollary: 'Corollary',
  definition: 'Definition', example: 'Example', remark: 'Remark', proof: 'Proof',
};
const THM_UNNUMBERED = new Set(['example', 'remark', 'proof']);
const THM_NAMES = Object.keys(THM_ENVS).join('|');
let thmCounter = 0;
const dedent = s => {
  const lines = s.replace(/^\n+|\s+$/g, '').split('\n');
  const pad = Math.min(...lines.filter(l => l.trim()).map(l => l.match(/^ */)[0].length));
  return lines.map(l => l.slice(pad)).join('\n');
};

// keep the extension's $$ block handling; swap its inline rule (it needs a space before the opening $)
const katexExt = markedKatex(katexOpts);
katexExt.extensions = katexExt.extensions.filter(e => e.level === 'block');
marked.use(katexExt);
marked.use({
  hooks: {
    preprocess(md) {
      for (const k of Object.keys(katexMacros)) delete katexMacros[k];
      Object.assign(katexMacros, baseMacros);
      thmCounter = 0;
      return md;
    },
  },
  extensions: [{
    name: 'texInline',
    level: 'inline',
    start(src) {
      for (let i = src.indexOf('$'); i !== -1; i = src.indexOf('$', i + 1)) {
        if (src[i - 1] !== '\\' && inlineMathRule.test(src.slice(i))) return i;
      }
    },
    tokenizer(src) {
      const m = src.match(inlineMathRule);
      if (m) return { type: 'texInline', raw: m[0], tex: m[2], display: m[1].length === 2 };
    },
    renderer: ({ tex, display }) => katex.renderToString(tex, { ...katexOpts, displayMode: display }),
  }, {
    name: 'thmEnv',
    level: 'block',
    start: src => src.match(new RegExp(`^ {0,3}\\\\begin\\{(?:${THM_NAMES})\\*?\\}`, 'm'))?.index,
    tokenizer(src) {
      const m = src.match(new RegExp(
        `^ {0,3}\\\\begin\\{((${THM_NAMES})\\*?)\\}(?:\\[([^\\]\\n]*)\\])?([\\s\\S]*?)\\\\end\\{\\1\\}[^\\S\\n]*(?:\\n+|$)`));
      if (!m) return;
      const [raw, full, env, title, body] = m;
      const numbered = !full.endsWith('*') && !THM_UNNUMBERED.has(env);
      return {
        type: 'thmEnv', raw, env,
        number: numbered ? ++thmCounter : null,
        title: title ? this.lexer.inlineTokens(title.trim()) : null,
        tokens: this.lexer.blockTokens(dedent(body), []),
      };
    },
    renderer({ env, number, title, tokens }) {
      const t = title && this.parser.parseInline(title);
      // like LaTeX, a proof's [title] replaces "Proof" ("Proof of Bézout") instead of adding a parenthetical
      const head = env === 'proof'
        ? `<span class="thm-name">${t || 'Proof'}.</span>`
        : `<span class="thm-name">${THM_ENVS[env]}${number ? ` ${number}` : ''}</span>`
          + (t ? ` <span class="thm-title">(${t})</span>` : '');
      return `<div class="thm thm-${env}"><div class="thm-head">${head}</div>`
        + `<div class="thm-body">${this.parser.parse(tokens)}</div></div>\n`;
    },
  }, {
    name: 'texEnv',
    level: 'block',
    start: src => src.match(/^\\begin\{/m)?.index,
    tokenizer(src) {
      const m = src.match(new RegExp(`^\\\\begin\\{(?!(?:${THM_NAMES})\\*?\\})([a-zA-Z*]+)\\}[\\s\\S]*?\\\\end\\{\\1\\}[^\\S\\n]*(?:\\n+|$)`));
      if (m) return { type: 'texEnv', raw: m[0], tex: m[0].trim() };
    },
    renderer: ({ tex }) => katex.renderToString(tex, { ...katexOpts, displayMode: true }) + '\n',
  }],
});

const app = express();
const PORT = process.env.PORT || 3000;
const POSTS_DIR = path.join(__dirname, 'posts');
const VISITS_FILE = path.join(__dirname, 'data', 'visits.json');

// ─── Visit counter (unique IPs) ───
function loadVisits() {
  try {
    const data = JSON.parse(fs.readFileSync(VISITS_FILE, 'utf-8'));
    return Array.isArray(data.ips) ? data : { ips: [] };
  } catch { return { ips: [] }; }
}
function saveVisits(data) {
  const dir = path.dirname(VISITS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(VISITS_FILE, JSON.stringify(data));
}
function trackVisit(req) {
  const ip = req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip;
  const data = loadVisits();
  if (!data.ips.includes(ip)) {
    data.ips.push(ip);
    saveVisits(data);
  }
  return data.ips.length;
}

// ─── Parse markdown frontmatter ───
// `relPath` is relative to POSTS_DIR, e.g. "foo.md" or "series/part-one.md".
// A folder's `index.md` is the parent post for that folder; its slug is the folder path.
function parsePost(relPath) {
  const raw = fs.readFileSync(path.join(POSTS_DIR, relPath), 'utf-8');
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return null;

  const meta = {};
  match[1].split('\n').forEach(line => {
    const [key, ...rest] = line.split(':');
    if (key && rest.length) meta[key.trim()] = rest.join(':').trim();
  });

  const noExt = relPath.replace(/\\/g, '/').replace(/\.md$/, '');
  const isIndex = path.posix.basename(noExt) === 'index';
  const slug = isIndex ? path.posix.dirname(noExt) : noExt;
  if (slug === '.') return null; // a top-level posts/index.md has nowhere to live
  const parentDir = path.posix.dirname(slug);
  const parent = parentDir === '.' ? null : parentDir;

  return {
    slug,
    ...meta,
    tags: meta.tags ? meta.tags.split(',').map(t => t.trim()) : [],
    part: meta.part !== undefined ? Number(meta.part) : null,
    parent,
    isIndex,
    body: match[2],
  };
}

// ─── Recursively list .md files under POSTS_DIR ───
function walkPosts(dir = '') {
  const abs = path.join(POSTS_DIR, dir);
  return fs.readdirSync(abs, { withFileTypes: true }).flatMap(ent => {
    const rel = dir ? `${dir}/${ent.name}` : ent.name;
    if (ent.isDirectory()) return walkPosts(rel);
    return ent.name.endsWith('.md') ? [rel] : [];
  });
}

// ─── Get all posts sorted by date descending ───
function getAllPosts() {
  if (!fs.existsSync(POSTS_DIR)) return [];
  return walkPosts()
    .map(parsePost)
    .filter(Boolean)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

// ─── Children of a parent post, ordered by `part` then date ascending ───
function getChildren(posts, slug) {
  return posts
    .filter(p => p.parent === slug)
    .sort((a, b) => {
      if (a.part !== null && b.part !== null && a.part !== b.part) return a.part - b.part;
      if (a.part !== null && b.part === null) return -1;
      if (a.part === null && b.part !== null) return 1;
      return new Date(a.date) - new Date(b.date);
    })
    .map(({ body, ...meta }) => meta);
}

// ─── API: top-level posts (metadata only). Sub-posts live under their parent. ───
app.get('/api/posts', (_req, res) => {
  const all = getAllPosts();
  const posts = all
    .filter(p => p.parent === null)
    .map(({ body, ...meta }) => ({ ...meta, childCount: getChildren(all, meta.slug).length }));
  res.json(posts);
});

// ─── API: single post (with rendered HTML). Slug may contain slashes. ───
app.get('/api/posts/*', (req, res) => {
  const slug = req.params[0].replace(/\/+$/, '');
  const all = getAllPosts();
  const post = all.find(p => p.slug === slug);
  if (!post) return res.status(404).json({ error: 'Post not found' });

  const children = getChildren(all, slug);
  let parent = null, prev = null, next = null;
  if (post.parent) {
    const parentPost = all.find(p => p.slug === post.parent);
    if (parentPost) parent = { slug: parentPost.slug, title: parentPost.title };
    const siblings = getChildren(all, post.parent);
    const i = siblings.findIndex(p => p.slug === slug);
    if (i > 0) prev = { slug: siblings[i - 1].slug, title: siblings[i - 1].title };
    if (i >= 0 && i < siblings.length - 1) next = { slug: siblings[i + 1].slug, title: siblings[i + 1].title };
  }

  res.json({ ...post, html: marked(post.body), children, parentPost: parent, prev, next });
});

// ─── Static files ───
app.use(express.static(path.join(__dirname, 'public'), { index: false }));
app.use('/katex', express.static(path.dirname(require.resolve('katex'))));

// ─── Dev mode (`npm run dev`): reload open tabs when posts/ or public/ change ───
// server.js changes are handled by `node --watch`; the tab reloads once it reconnects.
const DEV = process.env.DEV === '1';
const devClients = new Set();
const DEV_SCRIPT = `<script>
(() => {
  const y = sessionStorage.getItem('__devScroll');
  if (y !== null) {
    sessionStorage.removeItem('__devScroll');
    // posts render async, so wait for the page to be tall enough to scroll back
    const t0 = Date.now();
    (function restore() {
      if (document.body.scrollHeight >= +y + innerHeight || Date.now() - t0 > 3000) return scrollTo(0, +y);
      requestAnimationFrame(restore);
    })();
  }
  const reload = () => { sessionStorage.setItem('__devScroll', scrollY); location.reload(); };
  let dropped = false;
  const es = new EventSource('/__dev/events');
  es.onmessage = reload;
  es.onerror = () => { dropped = true; };
  es.onopen = () => { if (dropped) reload(); };
})();
</script>`;
if (DEV) {
  app.get('/__dev/events', (req, res) => {
    res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    res.flushHeaders();
    devClients.add(res);
    req.on('close', () => devClients.delete(res));
  });
  let pending;
  for (const dir of ['posts', 'public']) {
    fs.watch(path.join(__dirname, dir), { recursive: true }, (_event, file) => {
      if (!file || /(^|\/)\.|~$|\.sw[a-p]$/.test(file)) return; // editor swap/backup files
      clearTimeout(pending);
      pending = setTimeout(() => {
        console.log(`  changed: ${dir}/${file}`);
        for (const c of devClients) c.write('data: reload\n\n');
      }, 80);
    });
  }
}

// ─── SPA fallback: serve index.html with visit count ───
app.get('*', (req, res) => {
  const count = DEV ? 0 : trackVisit(req);
  let html = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf-8');
  if (DEV) html = html.replace('</body>', `${DEV_SCRIPT}</body>`);
  res.send(html.replace('id="visit-counter" data-count="0">0</div>', `id="visit-counter" data-count="${count}">${count}</div>`));
});

app.listen(PORT, () => {
  console.log(`Portfolio running at http://localhost:${PORT}`);
});
