import { listAudit, type AuditEntry } from './audit';
import type { Page } from './server-api';

// Staff invites (super admins only). The API can create an account and
// resend its invite, but can't list staff, so the "invited" list is built
// from the audit log, which records each step of an invite:
//   admin_created        → the account and first invite (targetId = user id,
//                          targetLabel = email, metadata.role / inviteEmailSent)
//   admin_invite_resent  → each resend (metadata.inviteEmailSent)
//   admin_invite_accepted / admin_login → they've set a password / signed in
// Accounts made any other way (seeded, or before auditing) don't show here.

export type CreatableRole = 'ADMIN' | 'MODERATOR';

// An invite link works for 72 hours (ACCOUNT_INVITE_TTL_HOURS in
// apps/api/src/auth/password-tokens.service.ts). Sending a new one cancels
// the old one.
export const INVITE_VALID_HOURS = 72;

export type InviteStatus = 'joined' | 'waiting' | 'expired' | 'email_failed';

export type StaffInvite = {
  userId: string;
  email: string;
  role: CreatableRole | null;
  invitedAt: string;
  invitedBy: string | null;
  // The latest invite email: the first one, or the latest resend.
  lastSentAt: string;
  resends: number;
  status: InviteStatus;
};

type Meta = { role?: unknown; inviteEmailSent?: unknown };

function meta(e: AuditEntry): Meta {
  return e.metadata && typeof e.metadata === 'object' && !Array.isArray(e.metadata) ? (e.metadata as Meta) : {};
}

// One entry (the newest) and the count of an action on one account.
async function latest(action: string, targetId: string, returnTo: string) {
  const res = await listAudit(
    new URLSearchParams({ action, targetId, limit: '1', sortBy: 'createdAt', sortOrder: 'desc' }),
    returnTo,
  );
  return { entry: res.data[0] ?? null, count: res.meta.total };
}

export async function listInvites(page: number, limit: number, returnTo: string): Promise<Page<StaffInvite>> {
  const created = await listAudit(
    new URLSearchParams({
      action: 'admin_created',
      page: String(page),
      limit: String(limit),
      sortBy: 'createdAt',
      sortOrder: 'desc',
    }),
    returnTo,
  );

  const rows = await Promise.all(
    created.data.map(async (c): Promise<StaffInvite> => {
      const [resent, accepted, login] = await Promise.all([
        latest('admin_invite_resent', c.targetId, returnTo),
        latest('admin_invite_accepted', c.targetId, returnTo),
        latest('admin_login', c.targetId, returnTo),
      ]);
      const last = resent.entry ?? c;
      const rawRole = meta(c).role;
      const joined = accepted.count > 0 || login.count > 0;
      const emailSent = meta(last).inviteEmailSent !== false;
      const expired = Date.now() - Date.parse(last.createdAt) > INVITE_VALID_HOURS * 3_600_000;
      return {
        userId: c.targetId,
        email: c.targetLabel ?? '—',
        role: rawRole === 'ADMIN' || rawRole === 'MODERATOR' ? rawRole : null,
        invitedAt: c.createdAt,
        invitedBy: c.adminName,
        lastSentAt: last.createdAt,
        resends: resent.count,
        status: joined ? 'joined' : !emailSent ? 'email_failed' : expired ? 'expired' : 'waiting',
      };
    }),
  );

  return { data: rows, meta: created.meta };
}
