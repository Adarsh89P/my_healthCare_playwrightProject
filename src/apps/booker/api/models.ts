import { z } from 'zod';

/**
 * Restful-Booker response contracts.
 *
 * Every shape below was verified against the live service
 * (https://restful-booker.herokuapp.com) rather than transcribed from its
 * documentation - the two disagree in places, and where they do, this file
 * follows observed behaviour and says so.
 *
 * Types are derived from the schemas with `z.infer`, so there is exactly one
 * source of truth per resource. Adding a field to a schema updates the type;
 * there is no parallel interface to forget.
 */

/** ISO calendar date, `YYYY-MM-DD`. The API returns this format for all dates. */
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'expected an ISO date in YYYY-MM-DD format');

export const BookingDatesSchema = z.object({
  checkin: isoDate,
  checkout: isoDate,
});

export const BookingSchema = z.object({
  firstname: z.string().min(1),
  lastname: z.string().min(1),
  /**
   * Strictly a number.
   *
   * Observed defect: POST with `"totalprice": "not-a-number"` is accepted with
   * 200 and the field is silently stored as `null`. Keeping this strict is what
   * makes that corruption fail a test instead of passing unnoticed.
   */
  totalprice: z.number(),
  depositpaid: z.boolean(),
  bookingdates: BookingDatesSchema,
  /** Genuinely optional - omitted from the response entirely when not sent. */
  additionalneeds: z.string().optional(),
});

/** POST /booking wraps the created resource alongside its new id. */
export const CreatedBookingSchema = z.object({
  bookingid: z.number().int().positive(),
  booking: BookingSchema,
});

/** GET /booking returns ids only, not full records. */
export const BookingIdSchema = z.object({
  bookingid: z.number().int().positive(),
});

export const BookingIdListSchema = z.array(BookingIdSchema);

/**
 * POST /auth on success.
 *
 * Observed: a 15-character hex string. Length is deliberately NOT asserted -
 * token length is an implementation detail, and pinning it would produce a
 * failing test on a harmless change. Non-empty is the real contract.
 */
export const AuthTokenSchema = z.object({
  token: z.string().min(1),
});

/**
 * POST /auth on failure.
 *
 * Observed defect: bad credentials return **200**, not 401, with this body.
 * A status-only assertion therefore reads a rejected login as a success, which
 * is precisely why `getToken()` validates the token's presence rather than the
 * status code.
 */
export const AuthFailureSchema = z.object({
  reason: z.string().min(1),
});

// ------------------------------------------------------------------- types

export type BookingDates = z.infer<typeof BookingDatesSchema>;
export type Booking = z.infer<typeof BookingSchema>;
export type CreatedBooking = z.infer<typeof CreatedBookingSchema>;
export type BookingId = z.infer<typeof BookingIdSchema>;
export type AuthToken = z.infer<typeof AuthTokenSchema>;
export type AuthFailure = z.infer<typeof AuthFailureSchema>;

/**
 * Request payload for creating a booking.
 *
 * Identical to `Booking` today, but kept as its own name: request and response
 * shapes drift apart in most APIs eventually, and sharing one alias makes that
 * divergence invisible when it happens.
 */
export type BookingPayload = Booking;
