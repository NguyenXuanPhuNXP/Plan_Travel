export function authRedirect(user, from) {
  const isAdmin = user?.role === 1 || user?.role === 'admin';
  const isBusiness = user?.role === 2 || user?.role === 'business';
  const internalPath = typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') && !from.includes('\\');
  const allowed = isAdmin
    ? /^\/admin(?:\/|[?#]|$)/i.test(from || '')
    : isBusiness
      ? /^\/(?:business|profile|notifications|explore|community)(?:\/|[?#]|$)/i.test(from || '')
      : !/^\/admin(?:\/|[?#]|$)/i.test(from || '');
  if (internalPath && allowed) return from;
  return homeForRole(user?.role);
}

export function homeForRole(role) {
  if (role === 1 || role === 'admin') return '/admin';
  if (role === 2 || role === 'business') return '/business';
  return '/dashboard';
}
