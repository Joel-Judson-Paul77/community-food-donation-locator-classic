import { Router } from 'express';
import { protect, optionalAuth, authorize } from '../middleware/auth.js';
import { uploadImage } from '../middleware/upload.js';
import * as auth from '../controllers/authController.js';
import * as donations from '../controllers/donationController.js';
import * as claims from '../controllers/claimController.js';
import * as stats from '../controllers/statsController.js';
import * as admin from '../controllers/adminController.js';

const router = Router();

router.get('/health', (_req, res) => res.json({ status: 'ok' }));

// Auth
router.post('/auth/register', auth.register);
router.post('/auth/login', auth.login);
router.get('/auth/me', protect, auth.me);
router.put('/auth/me', protect, auth.updateProfile);

// Donations (food listings)
router.get('/donations', donations.listDonations);
router.get('/donations/mine', protect, authorize('donor'), donations.myDonations);
router.get('/donations/:id', optionalAuth, donations.getDonation);
router.post('/donations', protect, authorize('donor'), uploadImage, donations.createDonation);
router.put('/donations/:id', protect, authorize('donor', 'admin'), uploadImage, donations.updateDonation);
router.patch('/donations/:id/cancel', protect, authorize('donor', 'admin'), donations.cancelDonation);
router.patch('/donations/:id/complete', protect, authorize('donor', 'admin'), donations.completeDonation);

// Claims (requests for food)
router.post('/claims', protect, authorize('recipient'), claims.createClaim);
router.get('/claims/mine', protect, authorize('recipient'), claims.myClaims);
router.get('/claims/incoming', protect, authorize('donor'), claims.incomingClaims);
router.patch('/claims/:id/approve', protect, authorize('donor'), claims.approveClaim);
router.patch('/claims/:id/reject', protect, authorize('donor'), claims.rejectClaim);
router.patch('/claims/:id/collect', protect, authorize('donor'), claims.collectClaim);
router.patch('/claims/:id/cancel', protect, authorize('recipient'), claims.cancelClaim);

// Stats
router.get('/stats/public', stats.publicStats);
router.get('/stats/me', protect, stats.myStats);

// Admin
router.use('/admin', protect, authorize('admin'));
router.get('/admin/stats', admin.adminStats);
router.get('/admin/users', admin.listUsers);
router.patch('/admin/users/:id', admin.updateUser);
router.delete('/admin/users/:id', admin.deleteUser);
router.get('/admin/donations', admin.listAllDonations);
router.delete('/admin/donations/:id', admin.deleteDonation);
router.get('/admin/claims', admin.listAllClaims);

export default router;
