const { supabase } = require('../../../config/supabase');
const ApiError = require('../../../utils/ApiError');

const getAddresses = async (userId) => {
  const { data, error } = await supabase
    .from('shipping_addresses')
    .select('*')
    .eq('user_id', userId)
    .order('is_default', { ascending: false });
  if (error) throw ApiError.internal(error.message);
  return data;
};

const addAddress = async (body, userId) => {
  const { data, error } = await supabase
    .from('shipping_addresses')
    .insert({ ...body, user_id: userId })
    .select()
    .single();
  if (error) throw ApiError.internal(error.message);
  return data;
};

const removeAddress = async (id, userId) => {
  const { error } = await supabase
    .from('shipping_addresses')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);
  if (error) throw ApiError.internal(error.message);
};

module.exports = { getAddresses, addAddress, removeAddress };
