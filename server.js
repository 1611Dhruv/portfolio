const express = require('express');
const path = require('path');
const fs = require('fs');
const { marked } = require('marked');

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

// ─── SPA fallback: serve index.html with visit count ───
app.get('*', (req, res) => {
  const count = trackVisit(req);
  const html = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf-8');
  res.send(html.replace('id="visit-counter" data-count="0">0</div>', `id="visit-counter" data-count="${count}">${count}</div>`));
});

app.listen(PORT, () => {
  console.log(`Portfolio running at http://localhost:${PORT}`);
});
