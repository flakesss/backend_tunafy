const { supabase, supabaseAdmin } = require('../../../config/supabase');
const ApiError = require('../../../utils/ApiError');

const uploadProof = async ({ order_id }, file, userId) => {
  // Upload gambar ke Supabase Storage
  const fileName = `payments/${order_id}-${Date.now()}.${file.mimetype.split('/')[1]}`;
  const { error: uploadError } = await supabaseAdmin.storage
    .from('payment-proofs')
    .upload(fileName, file.buffer, { contentType: file.mimetype });
  if (uploadError) throw ApiError.internal(uploadError.message);

  const { data: { publicUrl } } = supabaseAdmin.storage
    .from('payment-proofs')
    .getPublicUrl(fileName);

  const { data, error } = await supabase
    .from('payments')
    .insert({ order_id, proof_url: publicUrl, status: 'pending_verification' })
    .select()
    .single();
  if (error) throw ApiError.internal(error.message);
  return data;
};

const getByOrder = async (orderId) => {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('order_id', orderId)
    .single();
  if (error) throw ApiError.notFound('Data payment tidak ditemukan');
  return data;
};

module.exports = { uploadProof, getByOrder };
