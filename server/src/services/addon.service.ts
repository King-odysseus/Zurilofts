import prisma from '../config/prisma.js';
import { NotFoundError, ForbiddenError, ValidationError } from '../types/index.js';
import { recalculateBookingTotal } from './booking.service.js';

// ---------------------------------------------------------------
// Normalize helpers
// ---------------------------------------------------------------

function validateQuantity(qty: number): number {
  const n = Math.trunc(qty);
  if (!Number.isFinite(n) || n < 1 || n > 20) {
    throw new ValidationError('Quantity must be an integer between 1 and 20');
  }
  return n;
}

// ---------------------------------------------------------------
// Catalogue CRUD (admin)
// ---------------------------------------------------------------

interface CreateAddOnInput {
  name: string;
  description: string;
  price: number;
  image?: string;
  category: string;
}

interface UpdateAddOnInput {
  name?: string;
  description?: string;
  price?: number;
  image?: string;
  category?: string;
  active?: boolean;
}

export async function listAddOns() {
  return prisma.addOn.findMany({ orderBy: { category: 'asc' } });
}

export async function getAddOn(id: string) {
  const addOn = await prisma.addOn.findUnique({ where: { id } });
  if (!addOn) throw new NotFoundError('Add-on');
  return addOn;
}

export async function createAddOn(input: CreateAddOnInput) {
  if (!input.name?.trim()) throw new ValidationError('Name is required');
  if (!input.description?.trim()) throw new ValidationError('Description is required');
  if (typeof input.price !== 'number' || input.price <= 0) {
    throw new ValidationError('Price must be a positive number');
  }
  const validCategories = ['transport', 'catering', 'housekeeping', 'concierge'];
  if (!validCategories.includes(input.category)) {
    throw new ValidationError(`Category must be one of: ${validCategories.join(', ')}`);
  }

  return prisma.addOn.create({ data: input });
}

export async function updateAddOn(id: string, input: UpdateAddOnInput) {
  await getAddOn(id); // existence check

  if (input.category !== undefined) {
    const validCategories = ['transport', 'catering', 'housekeeping', 'concierge'];
    if (!validCategories.includes(input.category)) {
      throw new ValidationError(`Category must be one of: ${validCategories.join(', ')}`);
    }
  }
  if (input.price !== undefined && (typeof input.price !== 'number' || input.price <= 0)) {
    throw new ValidationError('Price must be a positive number');
  }

  return prisma.addOn.update({ where: { id }, data: input });
}

export async function deleteAddOn(id: string) {
  await getAddOn(id);
  await prisma.addOn.delete({ where: { id } });
}

// ---------------------------------------------------------------
// Property assignment (admin)
// ---------------------------------------------------------------

export async function getPropertyAddOns(propertyId: string) {
  const property = await prisma.property.findUnique({ where: { id: propertyId } });
  if (!property) throw new NotFoundError('Property');

  const assignments = await prisma.propertyAddOn.findMany({
    where: { propertyId },
    include: { addOn: true },
  });

  return assignments.map((a) => a.addOn);
}

export async function assignAddOnToProperty(propertyId: string, addOnId: string) {
  const property = await prisma.property.findUnique({ where: { id: propertyId } });
  if (!property) throw new NotFoundError('Property');
  await getAddOn(addOnId);

  // Idempotent: if already assigned, return existing
  const existing = await prisma.propertyAddOn.findUnique({
    where: { propertyId_addOnId: { propertyId, addOnId } },
  });
  if (existing) return existing;

  return prisma.propertyAddOn.create({
    data: { propertyId, addOnId },
    include: { addOn: true },
  });
}

export async function unassignAddOnFromProperty(propertyId: string, addOnId: string) {
  const existing = await prisma.propertyAddOn.findUnique({
    where: { propertyId_addOnId: { propertyId, addOnId } },
  });
  if (!existing) throw new NotFoundError('Property add-on assignment');

  await prisma.propertyAddOn.delete({
    where: { propertyId_addOnId: { propertyId, addOnId } },
  });
}

// ---------------------------------------------------------------
// Booking add-on mutations (guest)
// ---------------------------------------------------------------

async function getBookingForGuest(bookingId: string, userId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
  });

  if (!booking) throw new NotFoundError('Booking');
  if (booking.userId !== userId) throw new ForbiddenError('You are not the guest for this booking');
  if (booking.status === 'CANCELLED') throw new ValidationError('Cannot modify a cancelled booking');
  // PENDING and CONFIRMED are the only valid statuses at this point (the
  // schema also has CANCELLED). Treat CONFIRMED as still mutable for add-ons
  // since they are concierge items that can be added after payment.

  return booking;
}

export async function getBookingAddOns(bookingId: string, userId: string) {
  await getBookingForGuest(bookingId, userId);

  return prisma.bookingAddOn.findMany({
    where: { bookingId },
    include: { addOn: true },
  });
}

export async function addAddOnToBooking(
  bookingId: string,
  addOnId: string,
  quantity: number,
  userId: string
) {
  const booking = await getBookingForGuest(bookingId, userId);
  const qty = validateQuantity(quantity);

  // Verify the add-on exists, is active, and is assigned to this property
  const addOn = await prisma.addOn.findUnique({ where: { id: addOnId } });
  if (!addOn) throw new NotFoundError('Add-on');
  if (!addOn.active) throw new ValidationError('This add-on is no longer available');

  const assignment = await prisma.propertyAddOn.findUnique({
    where: { propertyId_addOnId: { propertyId: booking.propertyId, addOnId } },
  });
  if (!assignment) throw new ValidationError('This add-on is not available for this property');

  // Idempotent: if already on the booking, update quantity instead
  const existing = await prisma.bookingAddOn.findUnique({
    where: { bookingId_addOnId: { bookingId, addOnId } },
  });
  if (existing) {
    // Keep the original snapshot. Re-pricing here would let a catalogue price
    // change alter a booking the guest has already agreed to, which is exactly
    // what unitPrice exists to prevent.
    return prisma.$transaction(async (tx) => {
      const result = await tx.bookingAddOn.update({
        where: { bookingId_addOnId: { bookingId, addOnId } },
        data: { quantity: qty },
        include: { addOn: true },
      });
      await recalculateBookingTotal(bookingId, tx);
      return result;
    });
  }

  return prisma.$transaction(async (tx) => {
    const result = await tx.bookingAddOn.create({
      data: {
        bookingId,
        addOnId,
        quantity: qty,
        unitPrice: addOn.price, // server-sourced price
      },
      include: { addOn: true },
    });
    await recalculateBookingTotal(bookingId, tx);
    return result;
  });
}

export async function updateBookingAddOn(
  bookingId: string,
  addOnId: string,
  quantity: number,
  userId: string
) {
  await getBookingForGuest(bookingId, userId);
  const qty = validateQuantity(quantity);

  const existing = await prisma.bookingAddOn.findUnique({
    where: { bookingId_addOnId: { bookingId, addOnId } },
  });
  if (!existing) throw new NotFoundError('Booking add-on');

  // Quantity-only update: the unitPrice snapshot taken when the add-on was
  // first attached is deliberately preserved, so a later catalogue price
  // change cannot alter a booking the guest has already agreed to.
  return prisma.$transaction(async (tx) => {
    const result = await tx.bookingAddOn.update({
      where: { bookingId_addOnId: { bookingId, addOnId } },
      data: { quantity: qty },
      include: { addOn: true },
    });
    await recalculateBookingTotal(bookingId, tx);
    return result;
  });
}

export async function removeBookingAddOn(bookingId: string, addOnId: string, userId: string) {
  await getBookingForGuest(bookingId, userId);

  const existing = await prisma.bookingAddOn.findUnique({
    where: { bookingId_addOnId: { bookingId, addOnId } },
  });
  if (!existing) throw new NotFoundError('Booking add-on');

  await prisma.$transaction(async (tx) => {
    await tx.bookingAddOn.delete({
      where: { bookingId_addOnId: { bookingId, addOnId } },
    });
    await recalculateBookingTotal(bookingId, tx);
  });
}