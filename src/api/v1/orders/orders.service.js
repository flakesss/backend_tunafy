const { supabaseAdmin: supabase } = require('../../../config/supabase');
const ApiError = require('../../../utils/ApiError');

// ─── CART ─────────────────────────────────────────────────────────

/**
 * Ambil semua item di cart user, join dengan data produk.
 */
const getCart = async (userId) => {
  const { data, error } = await supabase
    .from('cart_items')
    .select(`
      id,
      qty_kg,
      product_id,
      products (
        id, name, species, form, grade,
        price_per_kg, stock_kg, min_order_kg, location, images
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) throw ApiError.internal(error.message);
  return data;
};

/**
 * Tambah item ke cart, atau update qty jika produk sudah ada (upsert).
 */
const addToCart = async (userId, productId, qtyKg) => {
  if (!productId) throw ApiError.badRequest('product_id wajib diisi');
  if (!qtyKg || qtyKg < 1) throw ApiError.badRequest('qty_kg minimal 1');

  // Cek produk tersedia
  const { data: product } = await supabase
    .from('products')
    .select('id, stock_kg')
    .eq('id', productId)
    .eq('is_active', true)
    .maybeSingle();
  if (!product) throw ApiError.notFound('Produk tidak ditemukan atau tidak aktif');

  // Upsert — tambah jika belum ada, update qty jika sudah ada
  const { data, error } = await supabase
    .from('cart_items')
    .upsert(
      { user_id: userId, product_id: productId, qty_kg: qtyKg },
      { onConflict: 'user_id,product_id', ignoreDuplicates: false }
    )
    .select(`
      id, qty_kg,
      products (id, name, species, form, grade, price_per_kg, location, images)
    `)
    .single();

  if (error) throw ApiError.internal(error.message);
  return data;
};

/**
 * Update qty item dalam cart.
 */
const updateCartQty = async (userId, productId, qtyKg) => {
  if (qtyKg < 1) throw ApiError.badRequest('Qty minimal 1 kg');

  const { data, error } = await supabase
    .from('cart_items')
    .update({ qty_kg: qtyKg, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('product_id', productId)
    .select()
    .single();

  if (error) throw ApiError.internal(error.message);
  if (!data) throw ApiError.notFound('Item tidak ditemukan di cart');
  return data;
};

/**
 * Hapus satu item dari cart.
 */
const removeFromCart = async (userId, productId) => {
  const { error } = await supabase
    .from('cart_items')
    .delete()
    .eq('user_id', userId)
    .eq('product_id', productId);
  if (error) throw ApiError.internal(error.message);
};

/**
 * Kosongkan seluruh cart user.
 */
const clearCart = async (userId) => {
  const { error } = await supabase
    .from('cart_items')
    .delete()
    .eq('user_id', userId);
  if (error) throw ApiError.internal(error.message);
};


// ─── ORDERS ───────────────────────────────────────────────────────

const createOrderFromCart = async (buyerId, shippingData) => {
  // Ambil cart user
  const cartItems = await getCart(buyerId);
  if (!cartItems || cartItems.length === 0) {
    throw ApiError.badRequest('Cart kosong. Tambahkan produk terlebih dahulu.');
  }

  // Validasi stok untuk setiap item di cart
  for (const item of cartItems) {
    const product = item.products;
    if (item.qty_kg > product.stock_kg) {
      throw ApiError.badRequest(
        `Stok tidak mencukupi untuk "${product.name}". Tersedia: ${product.stock_kg} kg, Diminta: ${item.qty_kg} kg`
      );
    }
  }

  // Hitung total produk (tanpa ongkir)
  const totalAmount = cartItems.reduce((sum, item) => {
    return sum + (item.products.price_per_kg * item.qty_kg);
  }, 0);

  // 1) Buat order
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      buyer_id: buyerId,
      status: 'pending',
      total_amount: totalAmount,
      shipping_address: shippingData,
      notes: shippingData.notes || null,
    })
    .select()
    .single();

  if (orderError) throw ApiError.internal(orderError.message);

  // 2) Insert order_items
  const orderItemsPayload = cartItems.map((item) => ({
    order_id: order.id,
    product_id: item.product_id,
    product_name: item.products.name,
    price_per_kg: item.products.price_per_kg,
    qty_kg: item.qty_kg,
  }));

  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(orderItemsPayload);

  if (itemsError) throw ApiError.internal(itemsError.message);

  // 3) Kosongkan cart
  await clearCart(buyerId);

  return { ...order, items: orderItemsPayload, total_amount: totalAmount };
};

/**
 * Ambil semua order milik user.
 */
const getAll = async (userId) => {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *, 
      order_items (
        id, product_name, price_per_kg, qty_kg, subtotal
      )
    `)
    .eq('buyer_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw ApiError.internal(error.message);
  return data;
};

/**
 * Ambil satu order by ID.
 */
const getById = async (id, userId) => {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      order_items (
        id, product_id, product_name, price_per_kg, qty_kg, subtotal
      )
    `)
    .eq('id', id)
    .eq('buyer_id', userId)
    .single();
  if (error) throw ApiError.notFound('Order tidak ditemukan');
  return data;
};

/**
 * Update status order (misal: buyer cancel).
 */
const updateStatus = async (id, status, userId) => {
  const validStatuses = ['cancelled']; // buyer hanya bisa cancel
  if (!validStatuses.includes(status)) {
    throw ApiError.forbidden('Anda tidak dapat mengubah status ke nilai tersebut');
  }

  const { data, error } = await supabase
    .from('orders')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('buyer_id', userId)
    .select()
    .single();
  if (error) throw ApiError.internal(error.message);
  return data;
};

module.exports = {
  getCart,
  addToCart,
  updateCartQty,
  removeFromCart,
  clearCart,
  createOrderFromCart,
  getAll,
  getById,
  updateStatus,
};
