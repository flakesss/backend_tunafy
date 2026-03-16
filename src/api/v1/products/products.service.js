const { supabase } = require('../../../config/supabase');
const ApiError = require('../../../utils/ApiError');

/**
 * Ambil semua produk dengan support filter, sort, dan pagination.
 * @param {Object} params - Query params dari request
 * @param {string} [params.species]  - Filter by species (bisa multi, pisah koma)
 * @param {string} [params.form]     - Filter by form
 * @param {string} [params.grade]    - Filter by grade
 * @param {string} [params.sort]     - 'price_asc' | 'price_desc' | 'newest' | default: 'newest'
 * @param {number} [params.page]     - Halaman (default: 1)
 * @param {number} [params.limit]    - Item per halaman (default: 12)
 * @param {string} [params.search]   - Keyword search di nama produk
 */
const getAll = async (params = {}) => {
  const {
    species,
    form,
    grade,
    sort = 'newest',
    page = 1,
    limit = 12,
    search,
  } = params;

  const pageNum  = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 12));
  const from     = (pageNum - 1) * limitNum;
  const to       = from + limitNum - 1;

  let query = supabase
    .from('products')
    .select('*, profiles!seller_id(full_name, username)', { count: 'exact' })
    .eq('is_active', true);

  // ─── Filter ───────────────────────────────────────────────────
  const SPECIES_MAP = {
    'bluefin': 'Bluefin Tuna',
    'bigeye': 'Bigeye Tuna',
    'yellowfin': 'Yellowfin Tuna',
  };

  const FORM_MAP = {
    'loin': 'Loin (Skin-on)',
    'whole': 'Whole',
    'steak': 'Steak',
    'fillet': 'Fillet',
  };

  if (species) {
    const speciesList = species.split(',').map((s) => SPECIES_MAP[s.trim()] || s.trim());
    query = query.in('species', speciesList);
  }
  if (form) {
    const formList = form.split(',').map((f) => FORM_MAP[f.trim()] || f.trim());
    query = query.in('form', formList);
  }
  if (grade) {
    const gradeList = grade.split(',').map((g) => g.trim());
    query = query.in('grade', gradeList);
  }
  if (search) {
    query = query.ilike('name', `%${search}%`);
  }

  // ─── Sort ─────────────────────────────────────────────────────
  switch (sort) {
    case 'price_asc':
      query = query.order('price_per_kg', { ascending: true });
      break;
    case 'price_desc':
      query = query.order('price_per_kg', { ascending: false });
      break;
    case 'newest':
    default:
      query = query.order('created_at', { ascending: false });
  }

  // ─── Pagination ───────────────────────────────────────────────
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
 * Ambil satu produk by ID.
 */
const getById = async (id) => {
  const { data, error } = await supabase
    .from('products')
    .select('*, profiles!seller_id(id, full_name, username, avatar_url)')
    .eq('id', id)
    .eq('is_active', true)
    .single();
  if (error) throw ApiError.notFound('Produk tidak ditemukan');
  return data;
};

/**
 * Tambah produk baru (hanya seller/admin).
 */
const create = async (body, sellerId) => {
  const { data, error } = await supabase
    .from('products')
    .insert({
      seller_id: sellerId,
      name: body.name,
      species: body.species,
      form: body.form,
      grade: body.grade,
      price_per_kg: body.price_per_kg,
      min_order_kg: body.min_order_kg || 1,
      stock_kg: body.stock_kg || 0,
      location: body.location,
      description: body.description,
      images: body.images || [],
    })
    .select()
    .single();
  if (error) throw ApiError.internal(error.message);
  return data;
};

/**
 * Update produk (hanya pemilik).
 */
const update = async (id, updates, sellerId) => {
  const { data, error } = await supabase
    .from('products')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('seller_id', sellerId)
    .select()
    .single();
  if (error) throw ApiError.internal(error.message);
  if (!data) throw ApiError.forbidden('Anda tidak memiliki produk ini');
  return data;
};

/**
 * Hapus produk (soft delete: set is_active = false).
 */
const remove = async (id, sellerId) => {
  const { error } = await supabase
    .from('products')
    .update({ is_active: false })
    .eq('id', id)
    .eq('seller_id', sellerId);
  if (error) throw ApiError.internal(error.message);
};

module.exports = { getAll, getById, create, update, remove };
