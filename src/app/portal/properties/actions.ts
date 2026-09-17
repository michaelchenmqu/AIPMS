"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { connectProperty } from "@/lib/channex";
import {
  switchToLongTerm,
  switchToShortTerm,
  createLease,
  recordRentPayment,
  endLease,
  createConditionReport,
  recordConditionRoomPhoto,
  scheduleInspection,
  sendInspectionNotice,
  startInspectionReport,
  completeInspection,
  cancelInspection,
  createTenantLogin,
  reviewTenantApplication,
  recordWaterUsageCharge,
  updateBondTracking,
  reviewRent,
  LeasingError,
} from "@/lib/leasing";
import type { ConditionReportType, ReviewStatus, RentFrequency, RoomKind } from "@prisma/client";

/** Staff action, "Connect to Channex" button on the property detail page.
 *  Registers the property with Channex and stores the returned ID — see
 *  lib/channex.ts. Throws if CHANNEX_API_KEY isn't set; the button is only
 *  rendered when it is (see the property detail page). */
export async function connectPropertyToChannex(propertyId: string) {
  await requireRole("STAFF");
  await connectProperty(propertyId);
  revalidatePath(`/portal/properties/${propertyId}`);
}

/** Staff action, the "Guest experience details" form on the property detail
 *  page — the wifi/check-in/checkout/house-manual/bin-day/gas-bottle fields
 *  the Guest App and the reminders in lib/reminders.ts draw on. */
export async function updateGuestExperience(propertyId: string, formData: FormData) {
  await requireRole("STAFF");
  const str = (key: string) => {
    const v = String(formData.get(key) ?? "").trim();
    return v || null;
  };
  await prisma.property.update({
    where: { id: propertyId },
    data: {
      wifiNetwork: str("wifiNetwork"),
      wifiPassword: str("wifiPassword"),
      checkInTime: str("checkInTime") ?? "3:00 PM",
      checkoutTime: str("checkoutTime") ?? "10:00 AM",
      houseManual: str("houseManual"),
      binDay: str("binDay"),
      hasGasBottle: formData.get("hasGasBottle") === "on",
    },
  });
  revalidatePath(`/portal/properties/${propertyId}`);
}

/** Staff action, "Switch to long-term leasing" / "Switch back to
 *  short-term" on the property detail page — see lib/leasing.ts for the
 *  guard rails. A LeasingError (e.g. an open reservation or active lease
 *  in the way) is expected, not a bug — report it instead of crashing. */
export async function togglePropertyLettingMode(propertyId: string, targetMode: "LONG_TERM" | "SHORT_TERM") {
  const user = await requireRole("STAFF");
  try {
    if (targetMode === "LONG_TERM") {
      await switchToLongTerm(propertyId, user.id);
    } else {
      await switchToShortTerm(propertyId, user.id);
    }
  } catch (err) {
    const message = err instanceof LeasingError ? err.message : "Something went wrong switching this property's mode.";
    redirect(`/portal/properties/${propertyId}?leaseError=${encodeURIComponent(message)}`);
  }
  revalidatePath(`/portal/properties/${propertyId}`);
  // A clean redirect on success too — otherwise a stale ?leaseError= from an
  // earlier blocked attempt can linger in the address bar and re-render on
  // this next, unrelated (successful) action.
  redirect(`/portal/properties/${propertyId}`);
}

/** Staff action, the "Add a lease" form on a LONG_TERM property with no
 *  active lease. */
export async function createLeaseAction(propertyId: string, formData: FormData) {
  await requireRole("STAFF");
  const str = (key: string) => String(formData.get(key) ?? "").trim();
  const num = (key: string) => {
    const v = str(key);
    return v ? Number(v) : undefined;
  };

  try {
    await createLease({
      propertyId,
      tenantName: str("tenantName"),
      tenantEmail: str("tenantEmail") || undefined,
      tenantPhone: str("tenantPhone") || undefined,
      startDate: new Date(str("startDate")),
      rentAmount: Number(str("rentAmount")),
      rentFrequency: str("rentFrequency") as RentFrequency,
      bondAmount: num("bondAmount"),
    });
  } catch (err) {
    const message = err instanceof LeasingError ? err.message : "Couldn't create the lease.";
    redirect(`/portal/properties/${propertyId}?leaseError=${encodeURIComponent(message)}`);
  }
  revalidatePath(`/portal/properties/${propertyId}`);
  redirect(`/portal/properties/${propertyId}`);
}

/** Staff action, "Record rent payment" on an active lease's card. */
export async function recordRentPaymentAction(propertyId: string, leaseId: string, formData: FormData) {
  await requireRole("STAFF");
  const amount = Number(formData.get("amount") ?? "");
  const dateRaw = String(formData.get("date") ?? "");

  try {
    await recordRentPayment(leaseId, { amount, date: dateRaw ? new Date(dateRaw) : new Date() });
  } catch (err) {
    const message = err instanceof LeasingError ? err.message : "Couldn't record that payment.";
    redirect(`/portal/properties/${propertyId}?leaseError=${encodeURIComponent(message)}`);
  }
  revalidatePath(`/portal/properties/${propertyId}`);
  redirect(`/portal/properties/${propertyId}`);
}

/** Staff action, "End lease" — see lib/leasing.ts#endLease. */
export async function endLeaseAction(propertyId: string, leaseId: string) {
  await requireRole("STAFF");
  await endLease(leaseId);
  revalidatePath(`/portal/properties/${propertyId}`);
  redirect(`/portal/properties/${propertyId}`);
}

/** Staff action, "+ Entry report" / "+ Exit report" on the property detail
 *  page's condition reports card — see lib/leasing.ts#createConditionReport.
 *  Redirects straight into the new report so staff can start uploading
 *  room photos immediately. */
export async function createConditionReportAction(propertyId: string, leaseId: string, type: ConditionReportType) {
  await requireRole("STAFF");
  let reportId: string;
  try {
    const report = await createConditionReport(leaseId, type as "ENTRY" | "EXIT");
    reportId = report.id;
  } catch (err) {
    const message = err instanceof LeasingError ? err.message : "Couldn't create that condition report.";
    redirect(`/portal/properties/${propertyId}?leaseError=${encodeURIComponent(message)}`);
  }
  revalidatePath(`/portal/properties/${propertyId}`);
  redirect(`/portal/properties/${propertyId}/condition-reports/${reportId}`);
}

/** Staff action, the photo upload form on each room card of a condition
 *  report — reads the uploaded file straight out of the FormData (Server
 *  Actions support File values natively) and hands its data URL to
 *  lib/leasing.ts#recordConditionRoomPhoto, same pattern the housekeeper
 *  room-check API route uses for JobRoomCheck. */
export async function recordConditionRoomPhotoAction(propertyId: string, reportId: string, room: RoomKind, formData: FormData) {
  await requireRole("STAFF");
  const file = formData.get("photo");
  if (file instanceof File && file.size > 0) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const dataUrl = `data:${file.type || "image/jpeg"};base64,${buffer.toString("base64")}`;
    await recordConditionRoomPhoto(reportId, room, dataUrl);
    revalidatePath(`/portal/properties/${propertyId}/condition-reports/${reportId}`);
  }
  redirect(`/portal/properties/${propertyId}/condition-reports/${reportId}`);
}

/** Staff action, the review buttons on a flagged condition-report room
 *  card — mirrors housekeeping/[id]/actions.ts#reviewRoomCheck for
 *  ConditionRoomCheck instead of JobRoomCheck. */
const CONDITION_REVIEW_DEFAULT_NOTE: Record<ReviewStatus, string> = {
  APPROVED: "Approved — looks good",
  REJECTED: "Rejected — redo required",
  RETURNED: "Returned for follow-up",
};

export async function reviewConditionRoomCheck(roomCheckId: string, status: ReviewStatus, note?: string) {
  const user = await requireRole("STAFF");
  const roomCheck = await prisma.conditionRoomCheck.update({
    where: { id: roomCheckId },
    data: {
      reviewedAt: new Date(),
      reviewedBy: user.name,
      reviewStatus: status,
      reviewNote: note?.trim() || CONDITION_REVIEW_DEFAULT_NOTE[status],
    },
    include: { conditionReport: { include: { lease: true } } },
  });
  revalidatePath(`/portal/properties/${roomCheck.conditionReport.lease.propertyId}/condition-reports/${roomCheck.conditionReportId}`);
}

export async function returnConditionRoomCheckWithComment(formData: FormData) {
  const roomCheckId = String(formData.get("roomCheckId") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  if (!roomCheckId || !note) return;
  await reviewConditionRoomCheck(roomCheckId, "RETURNED", note);
}

/** Staff action, "Schedule inspection" on the property detail page's
 *  routine inspections card. */
export async function scheduleInspectionAction(propertyId: string, leaseId: string, formData: FormData) {
  await requireRole("STAFF");
  const scheduledFor = String(formData.get("scheduledFor") ?? "");
  try {
    await scheduleInspection(leaseId, new Date(scheduledFor));
  } catch (err) {
    const message = err instanceof LeasingError ? err.message : "Couldn't schedule that inspection.";
    redirect(`/portal/properties/${propertyId}?leaseError=${encodeURIComponent(message)}`);
  }
  revalidatePath(`/portal/properties/${propertyId}`);
  redirect(`/portal/properties/${propertyId}`);
}

/** Staff action, "Send notice" on a scheduled inspection. */
export async function sendInspectionNoticeAction(propertyId: string, inspectionId: string) {
  await requireRole("STAFF");
  try {
    await sendInspectionNotice(inspectionId);
  } catch (err) {
    const message = err instanceof LeasingError ? err.message : "Couldn't send that notice.";
    redirect(`/portal/properties/${propertyId}?leaseError=${encodeURIComponent(message)}`);
  }
  revalidatePath(`/portal/properties/${propertyId}`);
  redirect(`/portal/properties/${propertyId}`);
}

/** Staff action, "Start inspection" — creates the ROUTINE condition report
 *  and sends staff straight to it to capture room photos. */
export async function startInspectionReportAction(propertyId: string, inspectionId: string) {
  await requireRole("STAFF");
  let reportId: string | null;
  try {
    const inspection = await startInspectionReport(inspectionId);
    reportId = inspection.conditionReportId;
  } catch (err) {
    const message = err instanceof LeasingError ? err.message : "Couldn't start that inspection.";
    redirect(`/portal/properties/${propertyId}?leaseError=${encodeURIComponent(message)}`);
  }
  revalidatePath(`/portal/properties/${propertyId}`);
  redirect(reportId ? `/portal/properties/${propertyId}/condition-reports/${reportId}` : `/portal/properties/${propertyId}`);
}

/** Staff action, "Mark complete" on an in-progress inspection. */
export async function completeInspectionAction(propertyId: string, inspectionId: string) {
  await requireRole("STAFF");
  try {
    await completeInspection(inspectionId);
  } catch (err) {
    const message = err instanceof LeasingError ? err.message : "Couldn't mark that inspection complete.";
    redirect(`/portal/properties/${propertyId}?leaseError=${encodeURIComponent(message)}`);
  }
  revalidatePath(`/portal/properties/${propertyId}`);
  redirect(`/portal/properties/${propertyId}`);
}

/** Staff action, "Cancel" on a scheduled/notice-sent inspection. */
export async function cancelInspectionAction(propertyId: string, inspectionId: string) {
  await requireRole("STAFF");
  try {
    await cancelInspection(inspectionId);
  } catch (err) {
    const message = err instanceof LeasingError ? err.message : "Couldn't cancel that inspection.";
    redirect(`/portal/properties/${propertyId}?leaseError=${encodeURIComponent(message)}`);
  }
  revalidatePath(`/portal/properties/${propertyId}`);
  redirect(`/portal/properties/${propertyId}`);
}

/** Staff action, "Create portal login" next to a tenant's name — see
 *  lib/leasing.ts#createTenantLogin. Shows the one-time temp password in
 *  a banner on success (there's no email-sending integration to hand a
 *  reset link off to instead) rather than silently creating it. */
export async function createTenantLoginAction(propertyId: string, tenantId: string) {
  await requireRole("STAFF");
  let email: string;
  let tempPassword: string;
  try {
    ({ email, tempPassword } = await createTenantLogin(tenantId));
  } catch (err) {
    const message = err instanceof LeasingError ? err.message : "Couldn't create that portal login.";
    redirect(`/portal/properties/${propertyId}?leaseError=${encodeURIComponent(message)}`);
  }
  revalidatePath(`/portal/properties/${propertyId}`);
  redirect(
    `/portal/properties/${propertyId}?tenantLoginEmail=${encodeURIComponent(email)}&tenantLoginPassword=${encodeURIComponent(tempPassword)}`
  );
}

/** Staff action, "Approve" / "Reject" on a pending application — see
 *  lib/leasing.ts#reviewTenantApplication. */
export async function reviewTenantApplicationAction(propertyId: string, applicationId: string, status: "APPROVED" | "REJECTED") {
  const user = await requireRole("STAFF");
  await reviewTenantApplication(applicationId, status, user.name ?? "Staff");
  revalidatePath(`/portal/properties/${propertyId}`);
  redirect(`/portal/properties/${propertyId}`);
}

/** Staff action, "Record water usage charge" on a lease's ledger — see
 *  lib/leasing.ts#recordWaterUsageCharge. */
export async function recordWaterUsageChargeAction(propertyId: string, leaseId: string, formData: FormData) {
  await requireRole("STAFF");
  const amount = Number(formData.get("amount") ?? "");
  const dateRaw = String(formData.get("date") ?? "");
  try {
    await recordWaterUsageCharge(leaseId, { amount, date: dateRaw ? new Date(dateRaw) : new Date() });
  } catch (err) {
    const message = err instanceof LeasingError ? err.message : "Couldn't record that water usage charge.";
    redirect(`/portal/properties/${propertyId}?leaseError=${encodeURIComponent(message)}`);
  }
  revalidatePath(`/portal/properties/${propertyId}`);
  redirect(`/portal/properties/${propertyId}`);
}

/** Staff action, "Update bond" on a lease's card — see
 *  lib/leasing.ts#updateBondTracking. */
export async function updateBondTrackingAction(propertyId: string, leaseId: string, formData: FormData) {
  await requireRole("STAFF");
  const bondStatus = String(formData.get("bondStatus") ?? "PENDING") as "PENDING" | "LODGED" | "CLAIMED" | "REFUNDED";
  const bondReference = String(formData.get("bondReference") ?? "").trim();
  const bondLodgedAtRaw = String(formData.get("bondLodgedAt") ?? "").trim();
  try {
    await updateBondTracking(leaseId, {
      bondStatus,
      bondReference: bondReference || undefined,
      bondLodgedAt: bondLodgedAtRaw ? new Date(bondLodgedAtRaw) : undefined,
    });
  } catch (err) {
    const message = err instanceof LeasingError ? err.message : "Couldn't update the bond.";
    redirect(`/portal/properties/${propertyId}?leaseError=${encodeURIComponent(message)}`);
  }
  revalidatePath(`/portal/properties/${propertyId}`);
  redirect(`/portal/properties/${propertyId}`);
}

/** Staff action, "Record rent review" on a lease's card — see
 *  lib/leasing.ts#reviewRent. */
export async function reviewRentAction(propertyId: string, leaseId: string, formData: FormData) {
  await requireRole("STAFF");
  const newRent = Number(formData.get("newRent") ?? "");
  const effectiveDateRaw = String(formData.get("effectiveDate") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  try {
    await reviewRent(leaseId, {
      newRent,
      effectiveDate: effectiveDateRaw ? new Date(effectiveDateRaw) : new Date(),
      note: note || undefined,
    });
  } catch (err) {
    const message = err instanceof LeasingError ? err.message : "Couldn't record that rent review.";
    redirect(`/portal/properties/${propertyId}?leaseError=${encodeURIComponent(message)}`);
  }
  revalidatePath(`/portal/properties/${propertyId}`);
  redirect(`/portal/properties/${propertyId}`);
}
