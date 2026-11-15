export function authRedirect(user, from) {
  const isAdmin = user?.role === 1 || user?.role === 'admin';
  const internalPath = typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') && !from.includes('\\');
  if (internalPath && (isAdmin || !/^\/admin(?:\/|[?#]|$)/i.test(from))) return from;
  return isAdmin ? '/admin' : '/dashboard';
}
