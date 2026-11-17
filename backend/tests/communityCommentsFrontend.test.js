import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import React from '../../frontend/node_modules/react/index.js';
import { renderToStaticMarkup } from '../../frontend/node_modules/react-dom/server.node.js';
import { transform } from '../../frontend/node_modules/rolldown/dist/utils-index.mjs';

test('Comment stars belong to the commenter and disappear when their rating is removed', async () => {
  const source = await readFile(new URL('../../frontend/src/pages/Community.jsx', import.meta.url), 'utf8');
  const fragment = source.slice(source.indexOf('{post.comments.map('), source.indexOf('{post.nextCommentCursor &&'));
  const { code } = await transform('comments.jsx', `function renderComments(React, Star, post, user = null, replyTo = null) {
    const busy = false;
    const reply = '';
    const displayDate = value => value;
    return <>${fragment}</>;
  }`, { jsx: { runtime: 'classic' } });
  const renderComments = new Function(`${code}; return renderComments;`)();
  const Star = props => React.createElement('svg', props);
  const post = {
    comments: [{ id: '1', author: { id: '2', name: 'Reader' }, content: 'Good trip', createdAt: '2026-11-15' }],
    ratings: [{ author: { id: '3' }, rating: 5 }, { author: { id: '2' }, rating: 4 }],
  };
  const html = renderToStaticMarkup(renderComments(React, Star, post));
  assert.match(html, /<strong>Reader<\/strong><span class="community-reviewer-rating" aria-label="4 trên 5 sao">/);
  assert.equal((html.match(/fill="currentColor"/g) || []).length, 4);
  assert.equal((html.match(/fill="none"/g) || []).length, 1);
  post.ratings = post.ratings.slice(0, 1);
  assert.ok(!renderToStaticMarkup(renderComments(React, Star, post)).includes('community-reviewer-rating'));
  post.author = { id: '9' };
  post.comments[0].replies = [{ id: '4', author: { id: '9', name: 'Owner' }, content: 'Thanks for asking!', createdAt: '2026-11-17' }];
  const publicHtml = renderToStaticMarkup(renderComments(React, Star, post));
  assert.match(publicHtml, /community-reply/);
  assert.match(publicHtml, /Thanks for asking!/);
  assert.ok(!publicHtml.includes('>Trả lời</button>'));
  const ownerHtml = renderToStaticMarkup(renderComments(React, Star, post, { id: '9' }, '1'));
  assert.match(ownerHtml, />Trả lời<\/button>/);
  assert.match(ownerHtml, /id="reply-form-1"/);
  assert.match(ownerHtml, /Gửi phản hồi/);
  assert.ok(!renderToStaticMarkup(renderComments(React, Star, post, { id: '2' })).includes('>Trả lời</button>'));
});
