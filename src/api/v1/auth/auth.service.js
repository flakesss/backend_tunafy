const { supabase } = require('../../../config/supabase');
const ApiError = require('../../../utils/ApiError');

/**
 * Register user baru via Supabase Auth.
 * Tabel `profiles` diisi otomatis via SQL trigger `on_auth_user_created`.
 */
const register = async ({ email, password, full_name, username }) => {
  if (!email || !password || !full_name || !username) {
    throw ApiError.badRequest('Field email, password, nama, dan username wajib diisi');
  }

  // Cek ketersediaan username & phone sebelum daftar
  if (username) {
    const { data: existingUsername } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username.toLowerCase())
      .maybeSingle();
    if (existingUsername) throw ApiError.badRequest('Username sudah digunakan');
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name,
        username: username.toLowerCase(),
        role: 'buyer',
      },
    },
  });

  if (error) throw ApiError.badRequest(error.message);
  return {
    user: data.user,
    session: data.session,
  };
};

/**
 * Login dengan email & password.
 */
const login = async ({ email, password }) => {
  if (!email || !password) {
    throw ApiError.badRequest('Email dan password wajib diisi');
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw ApiError.unauthorized('Email atau password salah');

  // Ambil role terbaru dari tabel profiles agar user_metadata tidak ketinggalan (out of sync)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .single();

  if (profile) {
    data.user.user_metadata = { ...data.user.user_metadata, role: profile.role };
  }

  return {
    user: data.user,
    session: data.session,
  };
};

/**
 * Logout — invalidate session di Supabase.
 */
const logout = async (token) => {
  const { error } = await supabase.auth.signOut();
  if (error) throw ApiError.internal(error.message);
};

/**
 * Refresh access token menggunakan refresh_token.
 */
const refresh = async (refresh_token) => {
  if (!refresh_token) throw ApiError.badRequest('Refresh token wajib diisi');
  const { data, error } = await supabase.auth.refreshSession({ refresh_token });
  if (error) throw ApiError.unauthorized('Refresh token tidak valid atau sudah kadaluarsa');

  // Sync ulang profile role
  if (data?.user?.id) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single();
    if (profile) {
      data.user.user_metadata = { ...data.user.user_metadata, role: profile.role };
    }
  }

  return {
    user: data.user,
    session: data.session,
  };
};

/**
 * Cek apakah username tersedia (belum dipakai user lain).
 */
const checkUsernameAvailability = async (username) => {
  if (!username || username.length < 3) {
    return { available: false, message: 'Username minimal 3 karakter' };
  }
  if (!/^[a-zA-Z0-9_.]{3,20}$/.test(username)) {
    return { available: false, message: '3-20 karakter: huruf, angka, underscore, titik' };
  }

  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username.toLowerCase())
    .maybeSingle();

  return data
    ? { available: false, message: 'Username sudah digunakan' }
    : { available: true, message: 'Tersedia ✓' };
};

/**
 * OAuth Callback — sinkronisasi profil user Google ke tabel `profiles`.
 * Dipanggil oleh frontend setelah Supabase berhasil autentikasi via Google.
 */
const oauthCallback = async ({ user }) => {
  if (!user || !user.id) {
    throw ApiError.badRequest('Data user tidak valid');
  }

  const { supabaseAdmin } = require('../../../config/supabase');

  // Cek apakah profil sudah ada
  const { data: existingProfile } = await supabaseAdmin
    .from('profiles')
    .select('id, username, full_name, role')
    .eq('id', user.id)
    .maybeSingle();

  if (existingProfile) {
    // Profil sudah ada, return langsung
    return { user: existingProfile, isNewUser: false };
  }

  // Profil belum ada — buat baru
  const emailPrefix = user.email.split('@')[0].replace(/[^a-zA-Z0-9_.]/g, '_');
  const randomSuffix = Math.floor(Math.random() * 9000) + 1000;
  const username = `${emailPrefix}_${randomSuffix}`.toLowerCase().slice(0, 20);

  const fullName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    emailPrefix;

  const { data: newProfile, error: insertError } = await supabaseAdmin
    .from('profiles')
    .insert({
      id: user.id,
      full_name: fullName,
      username,
      role: 'buyer',
    })
    .select('id, username, full_name, role')
    .single();

  if (insertError) throw ApiError.internal('Gagal membuat profil: ' + insertError.message);

  return { user: newProfile, isNewUser: true };
};

module.exports = {
  register,
  login,
  logout,
  refresh,
  checkUsernameAvailability,
  oauthCallback,
};
