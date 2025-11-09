# Feature Roadmap

This document outlines upcoming features and enhancements planned for the Advisory Status Tracker.

## Upcoming Features

### 1. Whitelabeling

**Priority:** High  
**Status:** Planned

Enable multi-tenant whitelabeling to allow different client logos and color schemes per program/deployment.

**Key Capabilities:**
- Custom logos per program/client
- Configurable color schemes (primary, secondary, accent colors)
- Customizable app name per deployment
- Theme configuration stored in database
- Logo storage via Supabase Storage
- Dynamic CSS variable injection based on program configuration

**Technical Approach:**
- Extend `programs` table with theme columns (logo_url, app_name, primary_color, secondary_color, accent_color)
- Create theme API endpoint to fetch program-specific branding
- Implement ThemeProvider component for dynamic CSS variable injection
- Update navigation and UI components to use theme variables
- Support for multiple deployment strategies (single deployment with multiple programs, or separate deployments per client)

**Implementation Notes:**
- Database migration required: Add whitelabel columns to programs table
- Supabase Storage bucket needed for logo uploads
- Theme configuration can be updated without code redeployment
- Backward compatible with existing deployments (defaults provided)

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
**Status:** Planned

Streamline workflows for quickly removing members from programs or workspaces, including just-in-time revocation and audit visibility.

**Key Capabilities:**
- One-click removal of members with optional reason capture
- Bulk revoke flow for multiple users at once
- Automatic cleanup of impersonation sessions and pending invites
- Notifications to program owners when access changes
- Audit trail entries recording who revoked access and why

**Technical Approach:**
- Extend Supabase role management with revocation helpers
- Add admin UI to `app/admin/members` for revoke actions and filtering
- Introduce server-side guards to immediately invalidate sessions/tokens
- Leverage background jobs (if needed) to cascade permissions removal
- Update audit log schema to capture revocation metadata

**Implementation Notes:**
- Coordinate with security review to ensure least-privilege defaults
- Provide undo window or grace period configuration
- Add automated tests covering revoke flows, including impersonation
- Document revocation procedures for admins and support staff

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

*Last Updated: 2025-01-XX*

