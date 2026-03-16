const { supabase } = require('../../../config/supabase');
const ApiError = require('../../../utils/ApiError');

/**
 * Ambil profil user berdasarkan ID.
 */
const getById = async (userId) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, full_name, avatar_url, role, created_at')
    .eq('id', userId)
    .single();
  if (error) throw ApiError.notFound('Profil tidak ditemukan');
  return data;
};

/**
 * Update profil user (tidak boleh mengubah role atau id sendiri).
 */
const update = async (userId, updates) => {
  // Whitelist field yang boleh diupdate oleh user
  const allowedFields = ['full_name', 'avatar_url', 'username'];
  const safeUpdates = {};
  allowedFields.forEach((field) => {
    if (updates[field] !== undefined) safeUpdates[field] = updates[field];
  });
  safeUpdates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('profiles')
    .update(safeUpdates)
    .eq('id', userId)
    .select('id, username, full_name, avatar_url, role, created_at')
    .single();
  if (error) throw ApiError.internal(error.message);
  return data;
};

module.exports = { getById, update };

