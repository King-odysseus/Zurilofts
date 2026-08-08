import { Request, Response, NextFunction } from 'express';
import * as msgService from '../services/message.service.js';
import prisma from '../config/prisma.js';

/**
 * GET /api/notifications
 * Returns combined unread/alert counts for badges + sound triggers.
 * Works for any authenticated role - guests, hosts, and admins all get
 * role-appropriate counts scoped to their data.
 */
export async function myNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.sub;
    const role = req.user!.role;

    // Only the admin owns the shared support inbox, so only the admin gets the
    // global unread total. Hosts and guests get the unread count of replies in
    // their OWN conversation - surfacing the platform-wide admin total to a host
    // would leak every customer's message volume across tenants.
    const unreadMessages = role === 'ADMIN'
      ? await msgService.getAdminUnreadCount()
      : await msgService.getUserUnreadCount(userId);

    // Hosts get a count of bookings on their properties that are still PENDING
    let pendingBookings = 0;
    if (role === 'HOST') {
      pendingBookings = await prisma.booking.count({
        where: { status: 'PENDING', property: { hostId: userId } },
      });
    }
    // Admins see all pending bookings
    if (role === 'ADMIN') {
      pendingBookings = await prisma.booking.count({
        where: { status: 'PENDING' },
      });
    }

    // Guests get a count of their bookings that were recently confirmed/cancelled
    // (status changed since they last checked the notification endpoint).
    // We use a lightweight approach: count bookings with status !== PENDING
    // that the guest hasn't acknowledged yet. For now, count all non-pending
    // bookings created in the last 7 days.
    let bookingUpdates = 0;
    if (role === 'USER') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      bookingUpdates = await prisma.booking.count({
        where: {
          userId,
          status: { in: ['CONFIRMED', 'CANCELLED'] },
          updatedAt: { gte: sevenDaysAgo },
        },
      });
    }

    res.json({
      success: true,
      data: { unreadMessages, pendingBookings, bookingUpdates },
    });
  } catch (error) {
    next(error);
  }
}
