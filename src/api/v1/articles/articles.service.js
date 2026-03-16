const { supabase, supabaseAdmin } = require('../../../config/supabase');
const ApiError = require('../../../utils/ApiError');

/**
 * Helper: generate slug from title
 */
const slugify = (text) =>
  text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');

/**
 * Ambil semua artikel yang sudah dipublish.
 * @param {Object} params - { lang, page, limit, category }
 */
const getAll = async (params = {}) => {
  const {
    lang = 'id',
    category,
    page = 1,
    limit = 12,
  } = params;

  const pageNum  = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 12));
  const from     = (pageNum - 1) * limitNum;
  const to       = from + limitNum - 1;

  let query = supabase
    .from('articles')
    .select('id, slug, lang, category, title, excerpt, cover_image, author_name, read_time_min, is_featured, created_at', { count: 'exact' })
    .eq('is_published', true)
    .eq('lang', lang)
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false });

  if (category && category !== 'all') {
    query = query.eq('category', category);
  }

  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) throw ApiError.internal(error.message);

  return {
    data,
    meta: {
      total: count,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(count / limitNum),
    },
  };
};

/**
 * Ambil satu artikel by slug + lang.
 */
const getBySlug = async (slug, lang = 'id') => {
  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .eq('slug', slug)
    .eq('lang', lang)
    .eq('is_published', true)
    .single();

  if (error || !data) throw ApiError.notFound('Artikel tidak ditemukan');
  return data;
};

// ─── Admin-only operations ────────────────────────────────────────

/**
 * Ambil semua artikel (termasuk draft) untuk admin.
 */
const adminGetAll = async (params = {}) => {
  const {
    lang,
    category,
    search,
    page = 1,
    limit = 20,
  } = params;

  const pageNum  = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const from     = (pageNum - 1) * limitNum;
  const to       = from + limitNum - 1;

  let query = supabaseAdmin
    .from('articles')
    .select('id, slug, lang, category, title, excerpt, cover_image, author_name, read_time_min, is_published, is_featured, created_at', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (lang) query = query.eq('lang', lang);
  if (category && category !== 'all') query = query.eq('category', category);
  if (search) query = query.ilike('title', `%${search}%`);

  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) throw ApiError.internal(error.message);

  return {
    data,
    meta: {
      total: count,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil((count || 0) / limitNum),
    },
  };
};

/**
 * Buat artikel baru.
 */
const create = async (body) => {
  const slug = body.slug || slugify(body.title);

  const { data, error } = await supabaseAdmin
    .from('articles')
    .insert({
      slug,
      lang:           body.lang || 'id',
      category:       body.category || 'Umum',
      title:          body.title,
      excerpt:        body.excerpt || '',
      content:        body.content || '',
      cover_image:    body.cover_image || '',
      author_name:    body.author_name || 'Admin Tunafy',
      read_time_min:  parseInt(body.read_time_min, 10) || 3,
      is_published:   body.is_published === true || body.is_published === 'true',
      is_featured:    body.is_featured === true || body.is_featured === 'true',
    })
    .select()
    .single();

  if (error) throw ApiError.internal(error.message);
  return data;
};

/**
 * Update artikel.
 */
const update = async (id, body) => {
  const updates = { updated_at: new Date().toISOString() };

  const allowed = [
    'slug', 'lang', 'category', 'title', 'excerpt', 'content',
    'cover_image', 'author_name', 'read_time_min', 'is_published', 'is_featured',
  ];
  allowed.forEach((key) => {
    if (body[key] !== undefined) updates[key] = body[key];
  });

  if (body.title && !body.slug) {
    updates.slug = slugify(body.title);
  }

  const { data, error } = await supabaseAdmin
    .from('articles')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw ApiError.internal(error.message);
  if (!data) throw ApiError.notFound('Artikel tidak ditemukan');
  return data;
};

/**
 * Hapus artikel.
 */
const remove = async (id) => {
  const { error } = await supabaseAdmin.from('articles').delete().eq('id', id);
  if (error) throw ApiError.internal(error.message);
};

/**
 * Toggle published status.
 */
const togglePublish = async (id) => {
  // Ambil status saat ini
  const { data: current, error: fetchErr } = await supabaseAdmin
    .from('articles')
    .select('is_published')
    .eq('id', id)
    .single();

  if (fetchErr || !current) throw ApiError.notFound('Artikel tidak ditemukan');

  const { data, error } = await supabaseAdmin
    .from('articles')
    .update({ is_published: !current.is_published, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw ApiError.internal(error.message);
  return data;
};

module.exports = { getAll, getBySlug, adminGetAll, create, update, remove, togglePublish };
