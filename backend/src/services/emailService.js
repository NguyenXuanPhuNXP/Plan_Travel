import net from 'node:net';
import tls from 'node:tls';

const getConfig = () => ({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER,
    password: process.env.SMTP_PASSWORD,
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true'
});

const configured = config => Boolean(config.host && config.user && config.password && config.from);
const base64 = value => Buffer.from(String(value), 'utf8').toString('base64');
const header = value => `=?UTF-8?B?${base64(value)}?=`;
const fromAddress = value => String(value).match(/<([^>]+)>/)?.[1] || String(value).replace(/^['"]|['"]$/g, '').trim();
const fromHeader = value => String(value).includes('<') ? String(value).replace(/^['"]|['"]$/g, '').trim() : `PlanTravel <${fromAddress(value)}>`;

function response(socket, accepted) {
    return new Promise((resolve, reject) => {
        let buffer = '';
        const onData = chunk => {
            buffer += chunk.toString();
            const lines = buffer.split(/\r?\n/);
            buffer = lines.pop() || '';
            for (const line of lines) {
                if (!/^\d{3} /.test(line)) continue;
                const code = Number(line.slice(0, 3));
                socket.off('data', onData);
                if (accepted.includes(code)) resolve(code);
                else reject(new Error(`SMTP ${code}: ${line.slice(4)}`));
                return;
            }
        };
        socket.on('data', onData);
        socket.once('error', reject);
    });
}

async function command(socket, text, accepted) {
    socket.write(`${text}\r\n`);
    return response(socket, accepted);
}

function openSocket(config) {
    return new Promise((resolve, reject) => {
        const socket = config.secure ? tls.connect({ host: config.host, port: config.port, servername: config.host }) : net.createConnection({ host: config.host, port: config.port });
        socket.setTimeout(15000, () => socket.destroy(new Error('SMTP connection timed out.')));
        socket.once('error', reject);
        socket.once(config.secure ? 'secureConnect' : 'connect', () => resolve(socket));
    });
}

export async function sendNotificationEmail({ to, title, message }) {
    const config = getConfig();
    if (!configured(config)) return { sent: false, reason: 'smtp_not_configured' };
    let socket = await openSocket(config);
    try {
        await response(socket, [220]);
        await command(socket, `EHLO ${process.env.SMTP_HELO || 'plantravel.local'}`, [250]);
        if (!config.secure) {
            await command(socket, 'STARTTLS', [220]);
            socket = await new Promise((resolve, reject) => {
                const secureSocket = tls.connect({ socket, servername: config.host });
                secureSocket.once('secureConnect', () => resolve(secureSocket));
                secureSocket.once('error', reject);
            });
            await command(socket, `EHLO ${process.env.SMTP_HELO || 'plantravel.local'}`, [250]);
        }
        await command(socket, 'AUTH LOGIN', [334]);
        await command(socket, base64(config.user), [334]);
        await command(socket, base64(config.password), [235]);
        // SMTP envelope addresses must contain only an email address. SMTP_FROM
        // may also be configured as a display name, e.g. Plan Travel <mail@...>.
        await command(socket, `MAIL FROM:<${fromAddress(config.from)}>`, [250]);
        await command(socket, `RCPT TO:<${to}>`, [250, 251]);
        await command(socket, 'DATA', [354]);
        socket.write([`From: ${fromHeader(config.from)}`, `To: ${to}`, `Subject: ${header(title)}`, 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: 8bit', '', message, '.'].join('\r\n') + '\r\n');
        await response(socket, [250]);
        await command(socket, 'QUIT', [221]);
        return { sent: true };
    } finally {
        if (!socket.destroyed) socket.end();
    }
}
