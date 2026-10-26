// One-off patch runner for the guide-sanitization change set.
// Fails loudly on any occurrence-count mismatch so a bad anchor cannot silently
// corrupt a file. Deleted after use.
import { readFileSync, writeFileSync } from 'node:fs';

function patch(path, edits) {
  const raw = readFileSync(path, 'utf8');
  const crlf = raw.split('\r\n').length - 1;
  const lf = raw.split('\n').length - 1;
  const mixed = crlf > 0 && lf > crlf;
  const eol = crlf > 0 ? '\r\n' : '\n';
  let text = raw.split('\r\n').join('\n');

  for (const [oldText, newText, expected] of edits) {
    const count = text.split(oldText).length - 1;
    if (count !== expected) {
      throw new Error(
        `${path}: expected ${expected} occurrence(s), found ${count} for anchor:\n${oldText.slice(0, 100)}`
      );
    }
    text = text.split(oldText).join(newText);
  }

  writeFileSync(path, eol === '\r\n' ? text.split('\n').join('\r\n') : text, 'utf8');
  console.log(`patched ${path} (eol=${eol === '\r\n' ? 'CRLF' : 'LF'}${mixed ? ', MIXED input normalized' : ''}, ${edits.length} edit(s))`);
}

// 1. Map a Prisma unique-constraint violation to 409 instead of a 500.
patch('server/src/middleware/errorHandler.ts', [
  [
    "  console.error('Unexpected error:', err);",
    `  // Prisma unique-constraint violation (P2002) is a client error, not a crash:
  // surface it as 409 so a caller gets an actionable message instead of a 500.
  // Duck-typed because the generated Prisma error class is not imported here.
  if ((err as { code?: string })?.code === 'P2002') {
    res.status(409).json({ success: false, error: 'That value is already taken' });
    return;
  }

  console.error('Unexpected error:', err);`,
    1,
  ],
]);

// 2. Sanitize on write.
patch('server/src/services/blog.service.ts', [
  [
    "import { NotFoundError } from '../types/index.js';",
    `import { NotFoundError } from '../types/index.js';
import { sanitizeHtml } from '../utils/sanitizeHtml.js';`,
    1,
  ],
  [
    `export async function createPost(data: { title: string; slug: string; excerpt?: string; body: string; coverImage?: string; published?: boolean }) {
  return prisma.blogPost.create({ data });
}`,
    `export async function createPost(data: { title: string; slug: string; excerpt?: string; body: string; coverImage?: string; published?: boolean }) {
  // Sanitize at the write boundary so unsafe markup never reaches the database.
  return prisma.blogPost.create({ data: { ...data, body: sanitizeHtml(data.body) } });
}`,
    1,
  ],
  [
    '  return prisma.blogPost.update({ where: { id }, data });',
    `  // Only sanitize when a body is supplied, so a partial update cannot blank it.
  const patch = data.body === undefined ? data : { ...data, body: sanitizeHtml(data.body) };
  return prisma.blogPost.update({ where: { id }, data: patch });`,
    1,
  ],
]);

// 3. Sanitize on the public read too (rows stored before the sanitizer existed).
patch('server/src/controllers/blog.controller.ts', [
  [
    "import * as blogService from '../services/blog.service.js';",
    `import * as blogService from '../services/blog.service.js';
import { sanitizeHtml } from '../utils/sanitizeHtml.js';`,
    1,
  ],
  [
    `      limit: limit ? Number(limit) : 12,
    });
    res.json({ success: true, data: result.posts, pagination: result.pagination });`,
    `      limit: limit ? Number(limit) : 12,
    });
    // Sanitize here rather than in the service: adminList shares listPosts and
    // the editor must round-trip the stored markup faithfully.
    const posts = result.posts.map((post) => ({ ...post, body: sanitizeHtml(post.body) }));
    res.json({ success: true, data: posts, pagination: result.pagination });`,
    1,
  ],
  [
    `    const post = await blogService.getPostBySlug(req.params.slug);
    res.json({ success: true, data: post });`,
    `    const post = await blogService.getPostBySlug(req.params.slug);
    res.json({ success: true, data: { ...post, body: sanitizeHtml(post.body) } });`,
    1,
  ],
]);

// 4. Guide schemas.
patch('server/src/types/index.ts', [
  [
    `// ============================================================
// Custom error classes`,
    `// ---- Guides (blog) ----

// Guide bodies are HTML rendered with dangerouslySetInnerHTML on the public
// guide page. Shape and size are bounded here; the markup itself is sanitized on
// write and again on the public read (see utils/sanitizeHtml.ts).
// AdminGuides.jsx derives slugs with exactly this pattern, so requiring it
// cannot reject a legitimate save.
const guideSlugSchema = z
  .string()
  .trim()
  .min(1, 'Slug is required')
  .max(200)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and single hyphens');

export const blogPostCreateSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  slug: guideSlugSchema,
  excerpt: z.string().max(500).optional(),
  body: z.string().min(1, 'Body is required').max(100_000),
  coverImage: z.string().max(500).optional(),
  published: z.boolean().optional(),
});

export const blogPostUpdateSchema = blogPostCreateSchema.partial();

// ============================================================
// Custom error classes`,
    1,
  ],
]);

// 5. Validate the two guide write routes (they previously passed req.body through).
patch('server/src/routes/admin.routes.ts', [
  [
    `  adminAccountDeletionSchema,
} from '../types/index.js';`,
    `  adminAccountDeletionSchema,
  blogPostCreateSchema,
  blogPostUpdateSchema,
} from '../types/index.js';`,
    1,
  ],
  [
    `router.post('/guides', blogCtrl.adminCreate);
router.put('/guides/:id', blogCtrl.adminUpdate);`,
    `router.post('/guides', validate(blogPostCreateSchema), blogCtrl.adminCreate);
router.put('/guides/:id', validate(blogPostUpdateSchema), blogCtrl.adminUpdate);`,
    1,
  ],
]);

console.log('all edits applied');
