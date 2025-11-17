# Feature Roadmap

This document outlines upcoming features and enhancements planned for the Advisory Status Tracker.

## Upcoming Features

### 1. Whitelabeling

**Priority:** High  
**Status:** ✅ Completed

Enable multi-tenant whitelabeling to allow different client logos and color schemes per program/deployment.

**Key Capabilities:**
- ✅ Custom logos per program/client
- ✅ Configurable color schemes (primary, secondary, accent colors)
- ✅ Customizable app name per deployment
- ✅ Theme configuration stored in database
- ✅ Logo storage via Supabase Storage
- ✅ Dynamic CSS variable injection based on program configuration

**Technical Approach:**
- ✅ Extended `programs` table with theme columns (logo_url, app_name, primary_color, secondary_color, accent_color)
- ✅ Created theme API endpoints (`/api/theme` GET/PATCH, `/api/theme/upload` POST/DELETE)
- ✅ Implemented ThemeProvider component for dynamic CSS variable injection
- ✅ Updated navigation and UI components to use theme variables
- ✅ Support for multiple deployment strategies (single deployment with multiple programs, or separate deployments per client)

**Implementation Notes:**
- ✅ Database migration: `scripts/migrations/008_add_whitelabel_columns.sql`
- ✅ Supabase Storage bucket: `program-logos` (public read, authenticated write)
- ✅ API endpoints: `/api/theme` (GET/PATCH), `/api/theme/upload` (POST/DELETE)
- ✅ UI components: `ThemeProvider`, `LogoUpload`, admin theme settings page
- ✅ Theme configuration can be updated without code redeployment
- ✅ Backward compatible with existing deployments (defaults provided)
- ✅ Admin UI: `/admin/theme` for OWNERs to configure branding

---

### 2. Project Management Tool Integrations

**Priority:** High  
**Status:** Planned

Integrate with leading project management tools to enable bidirectional data synchronization.

#### 2.1 Azure DevOps (ADO) Integration

**Key Capabilities:**
- Sync work items from Azure DevOps to workstreams
- Map ADO work items to status updates
- Two-way synchronization of status and progress
- Automatic workstream creation from ADO queries/boards
- Risk and action item synchronization

**Technical Approach:**
- Azure DevOps REST API integration
- OAuth authentication for ADO connections
- Configurable field mappings (ADO → Status Tracker)
- Background sync jobs for periodic updates
- Webhook support for real-time updates (optional)

**Integration Points:**
- Work Items ↔ Workstreams
- Risks ↔ ADO Risk items
- Actions ↔ ADO Tasks
- Status Updates ↔ ADO Status/Comments

**Future Integrations (To Be Prioritized):**
- Jira
- Linear
- Asana
- Monday.com
- Trello

---

### 3. Dashboard Update Automation

**Priority:** High  
**Status:** Planned

Expand the update feature to control all dashboard surfaces—KPIs, milestones, and workstream notes—via structured commands.

**Key Capabilities:**
- Modify KPI cards (e.g., “Update the Overall Status KPI to Green”, “Add a new KPI tracking users”)
- Append or adjust milestones (e.g., “Additional milestone in the next 7 days”)
- Edit the Notes section alongside status updates
- Validate and preview changes before they are applied
- Audit log of generated changes for review and rollback

**Technical Approach:**
- Extend the update pipeline to parse intent across KPIs, milestones, and notes
- Introduce domain-specific command grammars for dashboard artifacts
- Augment the database schema for new KPI definitions and note history
- Update the `UpdateWizard` client to surface multi-surface previews
- Ensure commands map to supabase mutations with transactional integrity

**Implementation Notes:**
- Requires supabase migrations for KPI metadata and audit trails
- Consider role-based restrictions on who can alter specific dashboard elements
- Add automated tests covering exemplar commands and edge cases
- Coordinate release with enablement docs and in-app guidance

---

### 4. Access Revocation Enhancements

**Priority:** Medium  
**Status:** ✅ Completed

Streamline workflows for quickly removing members from programs or workspaces, including just-in-time revocation and audit visibility.

**Key Capabilities:**
- ✅ One-click removal of members with optional reason capture
- ✅ Bulk revoke flow for multiple users at once
- ✅ Automatic cleanup of impersonation sessions (handled via cookie expiration)
- ✅ Audit trail entries recording who revoked access and why
- ⏳ Notifications to program owners when access changes (deferred to future enhancement)

**Technical Approach:**
- ✅ Extended Supabase role management with revocation helpers
- ✅ Added admin UI to `app/admin/members` for revoke actions with reason capture
- ✅ Created audit log table (`access_revocations`) to track all revocations
- ✅ Implemented bulk revocation endpoint with grouping support
- ✅ Added audit log UI with tabbed interface for viewing revocation history

**Implementation Notes:**
- ✅ Database migration: `scripts/migrations/007_add_access_revocation_audit.sql`
- ✅ API endpoints: `/api/members/[id]` (DELETE with reason), `/api/members/bulk-revoke` (POST), `/api/members/audit` (GET)
- ✅ UI components: `RevokeMemberDialog`, `BulkRevokeDialog`, `AuditLog`
- ✅ Impersonation cleanup: Handled naturally via cookie expiration (sessions invalidated on next request)
- ✅ Pending invites: Current system creates memberships directly, so no separate cleanup needed
- ✅ Security: OWNERs cannot be revoked (enforced in UI and API)

---

## Future Considerations

### Additional Features Under Consideration

- **Advanced Reporting**: Custom report templates, scheduled reports, export formats
- **Mobile App**: Native mobile applications for iOS and Android
- **Real-time Collaboration**: Live updates, comments, and notifications
- **Custom Fields**: Program-specific custom fields for workstreams, risks, and actions
- **Analytics Dashboard**: Advanced analytics and trend visualization
- **API Access**: Public API for third-party integrations
- **Bulk Operations**: Bulk import/export, bulk status updates
- **Advanced Permissions**: Fine-grained permission system beyond Owner/Contributor/Viewer

---

## Notes

- Features are listed in priority order
- Implementation timelines will be updated as development progresses
- Feature details may evolve based on user feedback and requirements
- Breaking changes will be documented in release notes

---

*Last Updated: 2025-01-27*

## Completed Features

### 1. Whitelabeling ✅
- See implementation details above
- Migration: `scripts/migrations/008_add_whitelabel_columns.sql`
- Admin UI: `/admin/theme`

