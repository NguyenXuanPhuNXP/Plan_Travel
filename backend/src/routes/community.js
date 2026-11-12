import express from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { authenticate, optionalAuth } from '../middleware/authMiddleware.js';
import * as community from '../services/communityService.js';

const router = express.Router();
router.get('/', optionalAuth, asyncHandler(async (req, res) => res.json(await community.listPosts(req.user?.id, req.query.before))));
router.get('/:id', optionalAuth, asyncHandler(async (req, res) => res.json(await community.getPost(req.params.id, req.user?.id, req.query.beforeComment))));
router.use(authenticate);
router.post('/', asyncHandler(async (req, res) => res.status(201).json(await community.createPost(req.user.id, req.body))));
router.put('/:id', asyncHandler(async (req, res) => res.json(await community.updatePost(req.params.id, req.user.id, req.body))));
router.delete('/:id', asyncHandler(async (req, res) => { await community.deletePost(req.params.id, req.user.id); res.sendStatus(204); }));
router.post('/:id/comments', asyncHandler(async (req, res) => res.status(201).json(await community.addComment(req.params.id, req.user.id, req.body))));
router.delete('/:id/comments/:commentId', asyncHandler(async (req, res) => { await community.deleteComment(req.params.id, req.params.commentId, req.user.id); res.sendStatus(204); }));
router.put('/:id/rating', asyncHandler(async (req, res) => res.json(await community.ratePost(req.params.id, req.user.id, req.body?.rating))));
router.delete('/:id/rating', asyncHandler(async (req, res) => res.json(await community.removeRating(req.params.id, req.user.id))));
export default router;
