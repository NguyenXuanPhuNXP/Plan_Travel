import { OAuth2Client } from 'google-auth-library';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';

const googleClient = new OAuth2Client();
const identityDDL = `CREATE TABLE IF NOT EXISTS google_auth_identities (
  google_sub VARCHAR(255) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_google_auth_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
)`;

// Isolated from password authentication. The additional table is created only
// on the first verified Google sign-in; existing tables/data are not altered.
export function createGoogleAuth({ prisma, createSession, verifyIdToken = (options) => googleClient.verifyIdToken(options) }) {
  let ready;
  const config = () => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId || !process.env.JWT_SECRET) {
      throw { status: 503, message: 'Đăng nhập Google chưa được cấu hình trên máy chủ.' };
    }
    return clientId;
  };

  const challenge = () => {
    config();
    const nonce = crypto.randomBytes(32).toString('hex');
    const nonceToken = jwt.sign({ nonce }, process.env.JWT_SECRET, {
      algorithm: 'HS256', audience: 'google-one-tap', expiresIn: '5m'
    });
    return { nonce, nonceToken };
  };

  const login = async ({ credential, nonceToken } = {}) => {
    const clientId = config();
    if (typeof credential !== 'string' || !credential || typeof nonceToken !== 'string') {
      throw { status: 400, message: 'Thiếu thông tin xác thực Google.' };
    }
    let payload;
    try {
      const challengeData = jwt.verify(nonceToken, process.env.JWT_SECRET, {
        algorithms: ['HS256'], audience: 'google-one-tap'
      });
      const ticket = await verifyIdToken({ idToken: credential, audience: clientId });
      payload = ticket.getPayload();
      if (!payload?.sub || !payload.email || payload.email_verified !== true ||
          !['accounts.google.com', 'https://accounts.google.com'].includes(payload.iss) ||
          payload.aud !== clientId ||
          !challengeData.nonce || payload.nonce !== challengeData.nonce) throw new Error('Invalid claims');
    } catch {
      throw { status: 401, message: 'Xác thực Google không hợp lệ hoặc đã hết hạn. Vui lòng thử lại.' };
    }

    if (!ready) ready = prisma.$executeRawUnsafe(identityDDL).catch((error) => { ready = undefined; throw error; });
    await ready;
    const email = payload.email.toLowerCase();
    const user = await prisma.$transaction(async (tx) => {
      const identities = await tx.$queryRaw`SELECT user_id FROM google_auth_identities WHERE google_sub = ${payload.sub}`;
      if (identities.length) {
        const existing = await tx.users.findUnique({ where: { id: identities[0].user_id } });
        if (!existing?.is_active) throw { status: 401, message: 'Tài khoản của bạn đã bị vô hiệu hóa.' };
        return existing;
      }
      let existing = await tx.users.findUnique({ where: { email } });
      if (existing) {
        if (!existing.is_active) throw { status: 401, message: 'Tài khoản của bạn đã bị vô hiệu hóa.' };
        // Google is authoritative for Gmail/Workspace addresses, but not for
        // arbitrary external email addresses. Do not silently link those.
        if (!email.endsWith('@gmail.com') && !payload.hd) {
          throw { status: 409, message: 'Email này đã có tài khoản. Vui lòng đăng nhập bằng mật khẩu.' };
        }
        const linked = await tx.$queryRaw`SELECT google_sub FROM google_auth_identities WHERE user_id = ${existing.id}`;
        if (linked.length) throw { status: 409, message: 'Tài khoản đã liên kết với một tài khoản Google khác.' };
      } else {
        existing = await tx.users.create({ data: {
          full_name: String(payload.name || email.split('@')[0]).slice(0, 150),
          email, password_hash: null, role: 'user', is_active: true,
          avatar_url: payload.picture ? String(payload.picture).slice(0, 500) : null
        } });
      }
      await tx.$executeRaw`INSERT INTO google_auth_identities (google_sub, user_id) VALUES (${payload.sub}, ${existing.id})`;
      return existing;
    });
    return createSession(user);
  };

  return { challenge, login };
}
