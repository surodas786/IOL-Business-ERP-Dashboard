import { branches } from '../data/branches';
import { getRoleById, nextId, roleLabel, userName } from './relations';
import { formatBDT } from './format';
import { validateUserDraft, zoneBranch, type UserDraft } from './userValidation';
import type { DemoUser, RoleId } from '../types/erp';
import type { AdminAreaLevel, RecordScope } from '../types/admin';
import type { DemoDatabase, EntityRef } from '../types/records';
import type { Actor, WorkflowResult } from './workflow';

export type AdminAction =
{type: 'ADMIN_SAVE_USER';draft: UserDraft;} |
{type: 'ADMIN_DEACTIVATE_USER';userId: string;successorId: string;} |
{type: 'ADMIN_REACTIVATE_USER';userId: string;} |
{type: 'ADMIN_SET_RECORD_SCOPE';roleId: RoleId;scope: RecordScope;} |
{type: 'ADMIN_SET_SUPERVISOR_POLICY';value: string;} |
{type: 'ADMIN_ADD_ORG_NODE';parentId: string;name: string;nameBn: string;} |
{type: 'ADMIN_RENAME_ORG_NODE';id: string;name: string;} |
{type: 'ADMIN_DELETE_ORG_NODE';id: string;} |
{type: 'ADMIN_SET_ORG_LEVELS';levels: string[];} |
{type: 'ADMIN_ADD_ADMIN_AREA';parentId: string | null;name: string;nameBn: string;code: string;} |
{type: 'ADMIN_SET_ZONE_COVERAGE';zoneId: string;adminAreaIds: string[];} |
{type: 'ADMIN_UPDATE_APPROVAL_RULE';ruleId: string;thresholdBdt?: number;approverRoles: RoleId[];slaHours: number;} |
{type: 'ADMIN_ADD_MASTER_ITEM';category: string;code: string;label: string;labelBn: string;} |
{type: 'ADMIN_TOGGLE_MASTER_ITEM';id: string;};

export function isAdminAction(a: {type: string;}): a is AdminAction {
  return a.type.startsWith('ADMIN_');
}

const AREA_LEVELS: AdminAreaLevel[] = ['Division', 'District', 'Upazila / Thana'];

function initials(name: string): string {
  return name.
  split(/\s+/).
  filter(Boolean).
  slice(0, 2).
  map((p) => p[0]?.toUpperCase() ?? '').
  join('');
}

export function applyAdminAction(db: DemoDatabase, action: AdminAction, actor: Actor, at: string): WorkflowResult {
  const fail = (message: string): WorkflowResult => ({ db, message, ok: false });
  const actorUser = db.users.find((u) => u.id === actor.id);
  if (!actorUser || !getRoleById(actorUser.role).permissions.includes('manageUsers'))
  return fail('Only a System Administrator can change administration settings.');

  const d: DemoDatabase = structuredClone(db);
  const audit = (act: string, summary: string, entity: EntityRef, related: EntityRef[] = []) => {
    d.auditEvents.unshift({ id: nextId(d.auditEvents, 'AE-', 5), at, actorName: actor.name, actorId: actor.id, action: act, summary, entity, related });
  };
  const ok = (message: string): WorkflowResult => ({ db: d, message, ok: true });

  switch (action.type) {
    case 'ADMIN_SAVE_USER':{
        const draft = action.draft;
        const errors = validateUserDraft(db, draft, actor.id);
        const first = Object.values(errors)[0];
        if (first) return fail(first);
        const role = draft.role as RoleId;
        const branch =
        draft.scopeType === 'company' ? null : draft.scopeType === 'branch' ? draft.scopeBranchId || null : zoneBranch(draft.zoneIds[0]) ?? null;
        const fields = {
          name: draft.name.trim(),
          nameBn: draft.nameBn.trim(),
          initials: initials(draft.name),
          email: draft.email.trim().toLowerCase(),
          phone: draft.phone.trim(),
          role,
          branch: branch as DemoUser['branch'],
          departmentId: draft.departmentId,
          stationBranchId: draft.stationBranchId as DemoUser['stationBranchId'],
          scopeType: draft.scopeType,
          zoneIds: draft.scopeType === 'zones' ? draft.zoneIds : [],
          managerId: draft.managerId || null
        };

        if (!draft.id) {
          const id = nextId(d.users, 'u-', 2);
          d.users.push({ id, ...fields, status: draft.status, createdAt: at });
          audit('User created', `${fields.name} · ${roleLabel(role)} · station ${branches.find((b) => b.id === fields.stationBranchId)?.name} · reports to ${userName(fields.managerId)}`, { type: 'user', id });
          return ok(`${fields.name} created with the ${roleLabel(role)} role.`);
        }

        const u = d.users.find((x) => x.id === draft.id)!;
        const changes: string[] = [];
        if (u.role !== fields.role) changes.push(`role ${roleLabel(u.role)} → ${roleLabel(fields.role)}`);
        if (u.departmentId !== fields.departmentId) changes.push('department');
        if (u.stationBranchId !== fields.stationBranchId) changes.push('station');
        if (u.branch !== fields.branch || u.scopeType !== fields.scopeType || u.zoneIds.join() !== fields.zoneIds.join()) changes.push('operational scope');
        if (u.managerId !== fields.managerId) changes.push(`reporting manager ${userName(u.managerId)} → ${userName(fields.managerId)}`);
        if (u.email !== fields.email || u.phone !== fields.phone || u.name !== fields.name || u.nameBn !== fields.nameBn) changes.push('contact details');
        if (changes.length === 0) return fail('No changes to save.');
        const roleChanged = u.role !== fields.role;
        Object.assign(u, fields);
        audit(roleChanged ? 'Role changed' : 'User updated', `${u.name}: ${changes.join('; ')}. Existing records keep their branch and zone tags.`, { type: 'user', id: u.id });
        return ok(`${u.name} updated.`);
      }

    case 'ADMIN_DEACTIVATE_USER':{
        const u = d.users.find((x) => x.id === action.userId);
        const successor = d.users.find((x) => x.id === action.successorId);
        if (!u || u.status !== 'Active') return fail('This account is not active.');
        if (u.id === actor.id) return fail('You can’t deactivate your own account.');
        if (!successor || successor.status !== 'Active' || successor.id === u.id) return fail('Choose an active successor.');

        const related: EntityRef[] = [];
        const record = (ref: EntityRef, field: 'Owner' | 'Account manager' | 'Reporting manager') => {
          d.ownershipChanges.unshift({ id: nextId(d.ownershipChanges, 'OC-', 4), record: ref, field, fromUserId: u.id, toUserId: successor.id, at, byUserId: actor.id });
          related.push(ref);
        };
        d.leads.filter((l) => l.ownerId === u.id && (l.status === 'New' || l.status === 'Qualified')).forEach((l) => {
          l.ownerId = successor.id;
          record({ type: 'lead', id: l.id }, 'Owner');
        });
        d.opportunities.filter((o) => o.ownerId === u.id && (o.status === 'Open' || o.status === 'Stalled')).forEach((o) => {
          o.ownerId = successor.id;
          record({ type: 'opportunity', id: o.id }, 'Owner');
        });
        d.customers.filter((c) => c.accountManagerId === u.id && c.status !== 'Disconnected').forEach((c) => {
          c.accountManagerId = successor.id;
          record({ type: 'customer', id: c.id }, 'Account manager');
        });
        d.users.filter((r) => r.managerId === u.id && r.id !== successor.id).forEach((r) => {
          r.managerId = successor.id;
          record({ type: 'user', id: r.id }, 'Reporting manager');
        });
        const kept =
        d.leads.filter((l) => l.ownerId === u.id).length +
        d.opportunities.filter((o) => o.ownerId === u.id).length +
        d.quotations.filter((q) => q.preparedById === u.id).length +
        d.approvals.filter((a) => a.requestedById === u.id || a.decidedById === u.id).length;
        u.status = 'Inactive';
        audit(
          'User deactivated',
          `${u.name} deactivated. ${related.length} open item${related.length === 1 ? '' : 's'} handed to ${successor.name}; ${kept} closed or historical record${kept === 1 ? '' : 's'} keep ${u.name} as the original owner.`,
          { type: 'user', id: u.id },
          [{ type: 'user', id: successor.id }, ...related]
        );
        return ok(`${u.name} deactivated. ${related.length} open items handed to ${successor.name}.`);
      }

    case 'ADMIN_REACTIVATE_USER':{
        const u = d.users.find((x) => x.id === action.userId);
        if (!u || u.status !== 'Inactive') return fail('This account is already active.');
        u.status = 'Active';
        audit('User reactivated', `${u.name} reactivated. Previously reassigned work stays with its current owner.`, { type: 'user', id: u.id });
        return ok(`${u.name} reactivated.`);
      }

    case 'ADMIN_SET_RECORD_SCOPE':{
        const p = d.policies.find((x) => x.id === `SCOPE-${action.roleId}`);
        if (!p) return fail('Policy not found.');
        if (action.scope === 'company' && !getRoleById(action.roleId).permissions.includes('allBranches'))
        return fail(`${roleLabel(action.roleId)} doesn’t hold company-wide authority.`);
        const from = p.value;
        p.value = action.scope;
        audit('Record scope changed', `${roleLabel(action.roleId)}: ${from} → ${action.scope}`, { type: 'policy', id: p.id });
        return ok(`Record scope for ${roleLabel(action.roleId)} set.`);
      }

    case 'ADMIN_SET_SUPERVISOR_POLICY':{
        const p = d.policies.find((x) => x.id === 'POL-SUPERVISOR')!;
        const from = p.value;
        p.value = action.value;
        audit('Supervisor visibility changed', `Draft policy ${from} → ${action.value}. Still awaiting IOL confirmation.`, { type: 'policy', id: p.id });
        return ok('Supervisor visibility draft saved. It remains awaiting IOL confirmation.');
      }

    case 'ADMIN_ADD_ORG_NODE':{
        const parent = d.orgNodes.find((n) => n.id === action.parentId);
        if (!parent) return fail('Parent not found.');
        if (!action.name.trim()) return fail('Enter a name.');
        if (parent.level + 1 >= d.orgLevels.length) return fail(`Maximum depth reached. Add a level below “${d.orgLevels[d.orgLevels.length - 1]}” first.`);
        const id = nextId(d.orgNodes.filter((n) => n.id.startsWith('ON-9')), 'ON-9', 3);
        d.orgNodes.push({ id, name: action.name.trim(), nameBn: action.nameBn.trim() || undefined, level: parent.level + 1, parentId: parent.id });
        audit('Organisation node added', `${d.orgLevels[parent.level + 1]} “${action.name.trim()}” added under ${parent.name}`, { type: 'orgNode', id }, [{ type: 'orgNode', id: parent.id }]);
        return ok(`${action.name.trim()} added.`);
      }

    case 'ADMIN_RENAME_ORG_NODE':{
        const n = d.orgNodes.find((x) => x.id === action.id);
        if (!n || !action.name.trim()) return fail('Enter a name.');
        const from = n.name;
        n.name = action.name.trim();
        audit('Organisation node renamed', `${from} → ${n.name}`, { type: 'orgNode', id: n.id });
        return ok('Renamed.');
      }

    case 'ADMIN_DELETE_ORG_NODE':{
        const n = d.orgNodes.find((x) => x.id === action.id);
        if (!n) return fail('Not found.');
        if (n.parentId === null) return fail('The company node can’t be removed.');
        if (d.orgNodes.some((x) => x.parentId === n.id)) return fail('Remove or move its child units first.');
        const people = d.users.filter((u) => u.departmentId === n.id).length;
        if (people) return fail(`${people} user${people === 1 ? ' is' : 's are'} assigned here. Move them first.`);
        d.orgNodes = d.orgNodes.filter((x) => x.id !== n.id);
        audit('Organisation node removed', `${n.name} removed`, { type: 'orgNode', id: n.id });
        return ok(`${n.name} removed.`);
      }

    case 'ADMIN_SET_ORG_LEVELS':{
        const levels = action.levels.map((l) => l.trim()).filter(Boolean);
        if (levels.length < 2 || levels.length > 6) return fail('Use between 2 and 6 levels.');
        const deepest = Math.max(...d.orgNodes.map((n) => n.level));
        if (levels.length <= deepest) return fail(`Nodes exist at the “${d.orgLevels[deepest]}” level. Remove them before removing the level.`);
        const from = d.orgLevels.join(' › ');
        d.orgLevels = levels;
        audit('Hierarchy levels changed', `${from} → ${levels.join(' › ')}`, { type: 'orgNode', id: 'ON-01' });
        return ok('Hierarchy levels updated.');
      }

    case 'ADMIN_ADD_ADMIN_AREA':{
        if (!action.name.trim() || !action.code.trim()) return fail('Enter a name and code.');
        if (d.adminAreas.some((a) => a.code === action.code.trim())) return fail('That geo code already exists.');
        const parent = action.parentId ? d.adminAreas.find((a) => a.id === action.parentId) : undefined;
        const levelIndex = parent ? AREA_LEVELS.indexOf(parent.level) + 1 : 0;
        if (levelIndex >= AREA_LEVELS.length) return fail('Upazila / Thana is the lowest administrative level.');
        const id = nextId(d.adminAreas.filter((a) => a.id.startsWith('AA-')), 'AA-', 3);
        d.adminAreas.push({ id, code: action.code.trim(), name: action.name.trim(), nameBn: action.nameBn.trim(), level: AREA_LEVELS[levelIndex], parentId: parent?.id ?? null });
        audit('Administrative area added', `${AREA_LEVELS[levelIndex]} “${action.name.trim()}”${parent ? ` in ${parent.name}` : ''}`, { type: 'adminArea', id });
        return ok(`${action.name.trim()} added. It isn’t covered by an operational zone yet.`);
      }

    case 'ADMIN_SET_ZONE_COVERAGE':{
        const zone = d.operationalZones.find((z) => z.id === action.zoneId);
        if (!zone) return fail('Zone not found.');
        const moved: string[] = [];
        d.operationalZones.forEach((z) => {
          if (z.id === zone.id) return;
          const keep = z.adminAreaIds.filter((a) => !action.adminAreaIds.includes(a));
          if (keep.length !== z.adminAreaIds.length) moved.push(z.name);
          z.adminAreaIds = keep;
        });
        zone.adminAreaIds = action.adminAreaIds;
        const names = action.adminAreaIds.map((id) => d.adminAreas.find((a) => a.id === id)?.name).join(', ');
        audit('Zone coverage changed', `${zone.name} now covers ${names || 'no areas'}${moved.length ? `; moved from ${moved.join(', ')}` : ''}. Administrative geography unchanged.`, { type: 'operationalZone', id: zone.id });
        return ok(`${zone.name} coverage saved.`);
      }

    case 'ADMIN_UPDATE_APPROVAL_RULE':{
        const rule = d.approvalRules.find((r) => r.id === action.ruleId);
        if (!rule) return fail('Rule not found.');
        if (action.approverRoles.length === 0) return fail('Choose at least one approver role.');
        const ineligible = action.approverRoles.filter((r) => !getRoleById(r).permissions.includes(rule.requiredPermission));
        if (ineligible.length) return fail(`${ineligible.map(roleLabel).join(', ')} can’t approve this — the role lacks the required authority.`);
        if (action.slaHours <= 0) return fail('SLA must be at least 1 hour.');
        if (rule.comparator !== 'any' && (!action.thresholdBdt || action.thresholdBdt <= 0)) return fail('Enter a threshold above zero.');
        const before = `${rule.approverRoles.map(roleLabel).join('/')}, ${rule.slaHours} h${rule.thresholdBdt ? `, ${formatBDT(rule.thresholdBdt)}` : ''}`;
        rule.approverRoles = action.approverRoles;
        rule.slaHours = action.slaHours;
        if (rule.comparator !== 'any') {
          rule.thresholdBdt = action.thresholdBdt;
          const pair = d.approvalRules.find((r) => r.id !== rule.id && r.approvalType === rule.approvalType && r.comparator !== 'any');
          if (pair) pair.thresholdBdt = action.thresholdBdt;
        }
        const after = `${rule.approverRoles.map(roleLabel).join('/')}, ${rule.slaHours} h${rule.thresholdBdt ? `, ${formatBDT(rule.thresholdBdt)}` : ''}`;
        audit('Approval rule changed', `${rule.name}: ${before} → ${after}`, { type: 'approvalRule', id: rule.id });
        return ok(`${rule.name} updated.`);
      }

    case 'ADMIN_ADD_MASTER_ITEM':{
        if (!action.code.trim() || !action.label.trim()) return fail('Enter a code and an English label.');
        if (d.masterData.some((m) => m.category === action.category && m.code.toLowerCase() === action.code.trim().toLowerCase()))
        return fail('That code already exists in this list.');
        const id = nextId(d.masterData, 'MD-', 3);
        d.masterData.push({ id, category: action.category, code: action.code.trim().toUpperCase(), label: action.label.trim(), labelBn: action.labelBn.trim(), active: true });
        audit('Master data added', `${action.category}: ${action.label.trim()}`, { type: 'masterData', id });
        return ok(`${action.label.trim()} added to ${action.category}.`);
      }

    case 'ADMIN_TOGGLE_MASTER_ITEM':{
        const m = d.masterData.find((x) => x.id === action.id);
        if (!m) return fail('Not found.');
        m.active = !m.active;
        audit(m.active ? 'Master data activated' : 'Master data retired', `${m.category}: ${m.label}. Existing records keep this value.`, { type: 'masterData', id: m.id });
        return ok(`${m.label} ${m.active ? 'activated' : 'retired'}.`);
      }
  }
}