const express = require('express');
const path = require('path');
const fs = require('fs');
const { marked } = require('marked');

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
function parsePost(filename) {
  const raw = fs.readFileSync(path.join(POSTS_DIR, filename), 'utf-8');
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return null;

  const meta = {};
  match[1].split('\n').forEach(line => {
    const [key, ...rest] = line.split(':');
    if (key && rest.length) meta[key.trim()] = rest.join(':').trim();
  });

  const slug = filename.replace(/\.md$/, '');
  return { slug, ...meta, tags: meta.tags ? meta.tags.split(',').map(t => t.trim()) : [], body: match[2] };
}

// ─── Get all posts sorted by date descending ───
function getAllPosts() {
  if (!fs.existsSync(POSTS_DIR)) return [];
  return fs.readdirSync(POSTS_DIR)
    .filter(f => f.endsWith('.md'))
    .map(parsePost)
    .filter(Boolean)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

// ─── API: all posts (metadata only) ───
app.get('/api/posts', (_req, res) => {
  const posts = getAllPosts().map(({ body, ...meta }) => meta);
  res.json(posts);
});

// ─── API: single post (with rendered HTML) ───
app.get('/api/posts/:slug', (req, res) => {
  const post = getAllPosts().find(p => p.slug === req.params.slug);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  res.json({ ...post, html: marked(post.body) });
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
