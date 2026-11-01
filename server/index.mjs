// HTTP server for the chat API (docs/chat-api.md).
import { createServer } from 'node:http';
import { answer, describeError } from './chat.mjs';

const PORT = Number(process.env.PORT) || 8787;
const MAX_BODY = 200_000;
const MAX_MESSAGES = 30;

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', chunk => {
      body += chunk;
      if (body.length > MAX_BODY) reject(new Error('body too large'));
    });
    req.on('end', () => {
      try { resolve(JSON.parse(body)); } catch (err) { reject(err); }
    });
    req.on('error', reject);
  });
}

function validMessages(messages) {
  return Array.isArray(messages)
    && messages.length > 0
    && messages.length <= MAX_MESSAGES
    && messages.every((m, i) =>
      m && typeof m.content === 'string' && m.content.trim()
      && m.role === (i % 2 === 0 ? 'user' : 'assistant'))
    && messages.at(-1).role === 'user';
}

const server = createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/api/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }
  if (req.method !== 'POST' || req.url !== '/api/chat') {
    res.writeHead(404).end();
    return;
  }

  let messages;
  try {
    ({ messages } = await readJson(req));
  } catch {
    res.writeHead(400).end('bad json');
    return;
  }
  if (!validMessages(messages)) {
    res.writeHead(400).end('messages must alternate user/assistant and end with user');
    return;
  }

  res.writeHead(200, { 'content-type': 'application/x-ndjson; charset=utf-8', 'cache-control': 'no-cache' });
  const send = event => res.write(JSON.stringify(event) + '\n');
  try {
    await answer(messages, send);
    send({ type: 'done' });
  } catch (err) {
    console.error(err);
    send({ type: 'error', message: describeError(err) });
  }
  res.end();
});

server.listen(PORT, () => {
  console.log(`chat server on http://localhost:${PORT}`);
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    console.warn('ANTHROPIC_API_KEY is not set: add it to .env (see .env.example)');
  }
});
