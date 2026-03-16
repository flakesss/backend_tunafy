const { supabaseAdmin } = require('../../../config/supabase');
const ApiError = require('../../../utils/ApiError');
const { randomUUID } = require('crypto');

// ─── Dashboard Summary ─────────────────────────────────────────────

/**
 * Stats ringkasan untuk dashboard admin.
 */
const getSummary = async () => {
  const [usersRes, productsRes, ordersRes, revenueRes] = await Promise.all([
    supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('products').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabaseAdmin.from('orders').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('orders').select('total_amount').in('status', ['delivered', 'confirmed', 'processing', 'shipped']),
  ]);

  const totalRevenue = (revenueRes.data || []).reduce((sum, o) => sum + Number(o.total_amount), 0);

  return {
    total_users: usersRes.count ?? 0,
    total_products: productsRes.count ?? 0,
    total_orders: ordersRes.count ?? 0,
    total_revenue: totalRevenue,
  };
};

// ─── Users ─────────────────────────────────────────────────────────

const getAllUsers = async ({ page = 1, limit = 20 } = {}) => {
  const from = (page - 1) * limit;
  const to   = from + limit - 1;
  const { data, error, count } = await supabaseAdmin
    .from('profiles')
    .select('id, username, full_name, role, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);
  if (error) throw ApiError.internal(error.message);
  return { data, meta: { total: count, page, limit, totalPages: Math.ceil(count / limit) } };
};

/**
 * Update role user (buyer → seller / seller → buyer).
 */
const updateUserRole = async (userId, role) => {
  const validRoles = ['buyer', 'seller', 'admin'];
  if (!validRoles.includes(role)) throw ApiError.badRequest('Role tidak valid');

  // Update di tabel profiles
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .update({ role, updated_at: new Date().toISOString() })
    .eq('id', userId);
  if (profileError) throw ApiError.internal(profileError.message);

  // Update juga di Supabase Auth user_metadata agar role.middleware bisa baca
  const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    user_metadata: { role },
  });
  if (authError) throw ApiError.internal(authError.message);

  return { id: userId, role };
};

// ─── Products ──────────────────────────────────────────────────────

const getAllProducts = async ({ page = 1, limit = 20, search } = {}) => {
  const from = (page - 1) * limit;
  const to   = from + limit - 1;

  let query = supabaseAdmin
    .from('products')
    .select('*, profiles!seller_id(id, username, full_name)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (search) query = query.ilike('name', `%${search}%`);

  const { data, error, count } = await query;
  if (error) throw ApiError.internal(error.message);
  return { data, meta: { total: count, page, limit, totalPages: Math.ceil(count / limit) } };
};

const createProduct = async (body, sellerId) => {
  const { data, error } = await supabaseAdmin
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
      is_active: true,
      catch_date: body.catch_date || null,
      vessel_name: body.vessel_name || null,
      ocean_zone: body.ocean_zone || null,
      vessel_id: body.vessel_id || null,
    })
    .select()
    .single();
  if (error) throw ApiError.internal(error.message);
  return data;
};

const updateProduct = async (id, updates) => {
  const allowed = ['name', 'species', 'form', 'grade', 'price_per_kg', 'min_order_kg', 'stock_kg', 'location', 'description', 'images', 'is_active', 'catch_date', 'vessel_name', 'ocean_zone', 'vessel_id'];
  const safe = {};
  allowed.forEach((k) => { if (updates[k] !== undefined) safe[k] = updates[k]; });
  safe.updated_at = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from('products')
    .update(safe)
    .eq('id', id)
    .select()
    .single();
  if (error) throw ApiError.internal(error.message);
  return data;
};

const deleteProduct = async (id) => {
  const { error } = await supabaseAdmin
    .from('products')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw ApiError.internal(error.message);
};

// ─── Orders ────────────────────────────────────────────────────────

const getAllOrders = async ({ page = 1, limit = 20, status } = {}) => {
  const from = (page - 1) * limit;
  const to   = from + limit - 1;

  let query = supabaseAdmin
    .from('orders')
    .select(`
      *,
      profiles!buyer_id(id, username, full_name),
      order_items(id, product_name, price_per_kg, qty_kg, subtotal)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (status) query = query.eq('status', status);

  const { data, error, count } = await query;
  if (error) throw ApiError.internal(error.message);
  return { data, meta: { total: count, page, limit, totalPages: Math.ceil(count / limit) } };
};

const updateOrderStatus = async (id, status) => {
  const valid = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
  if (!valid.includes(status)) throw ApiError.badRequest('Status tidak valid');

  // Ambil order saat ini untuk mengetahui status sebelumnya
  const { data: currentOrder, error: fetchError } = await supabaseAdmin
    .from('orders')
    .select('id, status')
    .eq('id', id)
    .single();
  
  if (fetchError) throw ApiError.internal(fetchError.message);
  if (!currentOrder) throw ApiError.notFound('Order tidak ditemukan');

  const previousStatus = currentOrder.status;

  // Jika status tidak berubah, tidak perlu melakukan apa-apa
  if (previousStatus === status) {
    return currentOrder;
  }

  // Ambil order_items secara terpisah untuk memastikan data lengkap
  const { data: orderItems, error: itemsError } = await supabaseAdmin
    .from('order_items')
    .select('product_id, qty_kg')
    .eq('order_id', id);
  
  if (itemsError) throw ApiError.internal(itemsError.message);
  if (!orderItems || orderItems.length === 0) {
    throw ApiError.notFound('Order items tidak ditemukan');
  }

  // LOGIKA PENGELOLAAN STOK:
  // - Saat status berubah ke 'confirmed': kurangi stok
  // - Saat status berubah ke 'cancelled' dari status yang sudah dikurangi stoknya: kembalikan stok
  
  const stockReducedStatuses = ['confirmed', 'processing', 'shipped', 'delivered'];
  const shouldReduceStock = status === 'confirmed' && !stockReducedStatuses.includes(previousStatus);
  const shouldRestoreStock = status === 'cancelled' && stockReducedStatuses.includes(previousStatus);

  console.log(`[Stock Management] Order ${id}: ${previousStatus} -> ${status}`);
  console.log(`[Stock Management] shouldReduceStock: ${shouldReduceStock}, shouldRestoreStock: ${shouldRestoreStock}`);

  // Kurangi stok saat konfirmasi
  if (shouldReduceStock) {
    for (const item of orderItems) {
      // Cek stok tersedia terlebih dahulu
      const { data: product, error: productError } = await supabaseAdmin
        .from('products')
        .select('id, name, stock_kg')
        .eq('id', item.product_id)
        .single();
      
      if (productError) throw ApiError.internal(productError.message);
      
      if (product.stock_kg < item.qty_kg) {
        throw ApiError.badRequest(
          `Stok tidak mencukupi untuk "${product.name}". Tersedia: ${product.stock_kg} kg, Diminta: ${item.qty_kg} kg`
        );
      }

      const newStock = product.stock_kg - item.qty_kg;
      console.log(`[Stock Reduction] Product ${item.product_id}: ${product.stock_kg} -> ${newStock} kg`);

      // Kurangi stok
      const { error: updateError } = await supabaseAdmin
        .from('products')
        .update({
          stock_kg: newStock,
          updated_at: new Date().toISOString()
        })
        .eq('id', item.product_id);
      
      if (updateError) throw ApiError.internal(updateError.message);
    }
  }

  // Kembalikan stok saat pembatalan (jika sebelumnya sudah dikurangi stoknya)
  if (shouldRestoreStock) {
    for (const item of orderItems) {
      // Ambil stok saat ini
      const { data: product, error: productError } = await supabaseAdmin
        .from('products')
        .select('id, name, stock_kg')
        .eq('id', item.product_id)
        .single();
      
      if (productError) throw ApiError.internal(productError.message);

      const newStock = product.stock_kg + item.qty_kg;
      console.log(`[Stock Restore] Product ${item.product_id}: ${product.stock_kg} -> ${newStock} kg`);

      // Kembalikan stok
      const { error: updateError } = await supabaseAdmin
        .from('products')
        .update({
          stock_kg: newStock,
          updated_at: new Date().toISOString()
        })
        .eq('id', item.product_id);
      
      if (updateError) throw ApiError.internal(updateError.message);
    }
  }

  // Update status order
  const { data, error } = await supabaseAdmin
    .from('orders')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw ApiError.internal(error.message);
  return data;
};

// ─── Payments ──────────────────────────────────────────────────────

const verifyPayment = async (id, status) => {
  const { data, error } = await supabaseAdmin
    .from('payments')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw ApiError.internal(error.message);
  return data;
};

// ─── Product Images ────────────────────────────────────────────────

/**
 * Upload hingga 10 foto produk ke Supabase Storage bucket 'product-images'.
 * @param {Express.Multer.File[]} files
 * @returns {string[]} array of public URLs
 */
const uploadProductImages = async (files) => {
  if (!files || files.length === 0) throw ApiError.badRequest('Tidak ada file yang diupload');
  if (files.length > 10) throw ApiError.badRequest('Maksimal 10 foto per produk');

  const urls = await Promise.all(
    files.map(async (file) => {
      const ext = file.mimetype.split('/')[1].replace('jpeg', 'jpg');
      const path = `products/${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`;

      const { error: uploadError } = await supabaseAdmin.storage
        .from('product-images')
        .upload(path, file.buffer, { contentType: file.mimetype, upsert: false });

      if (uploadError) throw ApiError.internal(`Upload gagal: ${uploadError.message}`);

      const { data: { publicUrl } } = supabaseAdmin.storage
        .from('product-images')
        .getPublicUrl(path);

      return publicUrl;
    })
  );

  return urls;
};

module.exports = {
  getSummary,
  getAllUsers,
  updateUserRole,
  getAllProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getAllOrders,
  updateOrderStatus,
  verifyPayment,
  uploadProductImages,
};
