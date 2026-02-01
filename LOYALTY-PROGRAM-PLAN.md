# Loyalty Program Feature - Implementation Plan

## Overview

Transform the "Design" page into a comprehensive "Loyalty Program" configuration hub that manages all aspects of the loyalty program beyond just card visuals.

---

## Phase 1: Core Page Restructure (Frontend Only) ✅ COMPLETED

### What was built:
- New `/loyalty-program` route with redesigned layout
- Active card preview section (clickable to edit)
- Program settings sections (Business URL, Data Collection, Locations, Notifications)
- Card designs grid for Pro users
- Sidebar navigation renamed to "Loyalty Program"
- RBAC updated for new route
- Legacy `/design` route redirects to `/loyalty-program`

### Files created:
- `web/src/app/(dashboard)/loyalty-program/page.tsx`
- `web/src/components/loyalty-program/ActiveCardSection.tsx`
- `web/src/components/loyalty-program/ProgramSettingsSidebar.tsx`
- `web/src/components/loyalty-program/CardDesignsGrid.tsx`
- `web/src/components/loyalty-program/sections/BusinessUrlSection.tsx`
- `web/src/components/loyalty-program/sections/DataCollectionSection.tsx`
- `web/src/components/loyalty-program/sections/LocationsSection.tsx`
- `web/src/components/loyalty-program/sections/NotificationsSection.tsx`

---

## Phase 2: Customer Data Collection (Full Implementation)

### Goal
Allow businesses to configure what information to collect from customers when they sign up for a loyalty card.

### Frontend Tasks
1. **DataCollectionSection enhancements**
   - Add form preview showing what customers will see
   - Add field reordering (drag & drop) for Pro users
   - Add custom field creation for Pro users (future)

2. **Integration with registration page**
   - Update customer registration form to respect these settings
   - Dynamic form rendering based on business config

### Backend Tasks
1. **Business settings schema**
   - Extend `businesses.settings` JSONB to include:
     ```json
     {
       "customer_data_collection": {
         "collect_name": true,
         "collect_email": true,
         "collect_phone": false,
         "required_fields": ["email"],
         "custom_fields": []
       }
     }
     ```

2. **API changes**
   - `PUT /businesses/{id}` - Already supports settings updates
   - Add validation for settings structure

3. **Customer registration endpoint**
   - `POST /customers` - Validate against business's data collection config
   - Return appropriate errors for missing required fields

### Files to modify:
- `backend/app/routers/businesses.py` - Add settings validation
- `backend/app/routers/customers.py` - Validate against config
- `web/src/app/[slug]/page.tsx` - Customer registration form (if exists)
- `web/src/components/loyalty-program/sections/DataCollectionSection.tsx`

### Verification
- Toggle settings on/off, verify saved to database
- Create customer with/without required fields
- Verify registration form dynamically shows/hides fields

---

## Phase 3: Business URL Slug Management

### Goal
Allow Pro users to edit their business URL slug with appropriate warnings.

### Frontend Tasks
1. **BusinessUrlSection enhancements**
   - Inline editing mode for Pro users
   - Real-time availability checking (debounced)
   - Warning dialog about QR code implications
   - Success/error feedback

2. **URL validation**
   - Pattern: `^[a-z0-9-]+$`
   - Length: 3-50 characters
   - No consecutive hyphens
   - Availability check against existing slugs

### Backend Tasks
1. **Database changes**
   - Add `last_slug_edit_at` column to `businesses` table
   ```sql
   ALTER TABLE businesses ADD COLUMN last_slug_edit_at TIMESTAMPTZ;
   ```

2. **API changes**
   - `PUT /businesses/{id}` - Allow `url_slug` updates
   - Add rate limiting for Pay plan (1 edit per day - currently Pay can't edit at all)
   - Validate slug format and uniqueness
   - Record edit timestamp

3. **Validation endpoint**
   - `GET /businesses/slug/{url_slug}/available` - Already exists

### Files to modify:
- `backend/database/schema.py` - Add migration
- `backend/app/routers/businesses.py` - Add slug update logic
- `web/src/components/loyalty-program/sections/BusinessUrlSection.tsx`
- `web/src/api/businesses.ts` - Add slug update function

### Verification
- Pro user can edit slug, see real-time availability
- Warning dialog appears before confirming
- Slug changes reflected in public URL
- Pay user sees read-only display

---

## Phase 4: Locations & Geofencing

### Goal
Allow businesses to manage store locations with optional geofencing for Apple Wallet notifications.

### Frontend Tasks
1. **LocationsSection enhancements**
   - Location list with CRUD operations
   - Address autocomplete (optional - could use simple text input)
   - Map preview (optional - could defer)
   - Geofencing toggle with radius slider (Pro only)
   - Primary location marker

2. **Plan-based restrictions**
   - Pay: 1 location only
   - Pro: Unlimited locations + geofencing

### Backend Tasks
1. **Database changes**
   - New `locations` table:
   ```sql
   CREATE TABLE locations (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
     name TEXT NOT NULL,
     address TEXT,
     latitude DOUBLE PRECISION,
     longitude DOUBLE PRECISION,
     geofence_enabled BOOLEAN DEFAULT false,
     geofence_radius_meters INTEGER DEFAULT 100,
     is_primary BOOLEAN DEFAULT false,
     created_at TIMESTAMPTZ DEFAULT now(),
     updated_at TIMESTAMPTZ DEFAULT now()
   );

   -- Only one primary per business
   CREATE UNIQUE INDEX idx_locations_primary
   ON locations (business_id) WHERE is_primary = true;
   ```

2. **API endpoints**
   - `GET /businesses/{id}/locations` - List all locations
   - `POST /businesses/{id}/locations` - Create location
   - `PUT /businesses/{id}/locations/{location_id}` - Update location
   - `DELETE /businesses/{id}/locations/{location_id}` - Delete location
   - `POST /businesses/{id}/locations/{location_id}/set-primary` - Set as primary

3. **Plan enforcement**
   - Pay plan: Max 1 location, geofencing disabled
   - Pro plan: Unlimited locations, geofencing available

4. **Pass generation integration**
   - Include location data in Apple Wallet passes
   - Enable geofencing notifications for Pro users

### Files to create:
- `backend/app/routers/locations.py` - New router
- `backend/app/models/location.py` - Pydantic models
- `web/src/api/locations.ts` - API client
- `web/src/types/location.ts` - TypeScript types

### Files to modify:
- `backend/app/main.py` - Register locations router
- `backend/app/services/pass_generator.py` - Include location data
- `web/src/components/loyalty-program/sections/LocationsSection.tsx`

### Verification
- CRUD operations work for locations
- Pay user limited to 1 location
- Pro user can add multiple + enable geofencing
- Location data appears in generated passes

---

## Phase 5: Notification Templates

### Goal
Allow businesses to customize push notification text sent to customers.

### Frontend Tasks
1. **NotificationsSection enhancements**
   - Editable text fields for Pro users
   - Variable insertion (click to add `{customer_name}`, `{remaining}`, etc.)
   - Live preview of notification
   - Character count limits

2. **Plan-based restrictions**
   - Pay: Read-only default templates
   - Pro: Fully customizable

### Backend Tasks
1. **Business settings extension**
   - Store templates in `businesses.settings`:
   ```json
   {
     "notification_templates": {
       "stamp": {
         "title": "Stamp Added!",
         "message": "You earned a stamp! {remaining} more to go."
       },
       "milestone": {
         "title": "Almost There!",
         "message": "Just {remaining} more stamps until your reward!"
       },
       "reward": {
         "title": "Reward Ready!",
         "message": "Congratulations! You've earned your reward."
       }
     }
   }
   ```

2. **Template rendering service**
   - Create function to replace variables in templates
   - Variables: `{customer_name}`, `{remaining}`, `{total}`, `{reward_name}`

3. **Integration with stamp endpoint**
   - `POST /stamps/{customer_id}` - Use templates when sending notifications
   - Fall back to defaults if no custom templates

### Files to modify:
- `backend/app/routers/stamps.py` - Use templates for notifications
- `backend/app/services/apns.py` - Template rendering
- `web/src/components/loyalty-program/sections/NotificationsSection.tsx`

### Verification
- Pro user can edit templates, see preview
- Pay user sees read-only defaults
- Stamps trigger notifications with custom/default text
- Variables are correctly substituted

---

## Phase 6: Card Scheduling (Pro Only)

### Goal
Allow Pro users to schedule card designs to activate/deactivate at specific times.

### Frontend Tasks
1. **ScheduleDialog component**
   - Calendar date picker for start/end dates
   - Visual timeline showing scheduled cards
   - Conflict detection (prevent overlapping schedules)
   - Campaign mode (has end date, reverts to default) vs Permanent mode

2. **CardDesignsGrid enhancements**
   - Show scheduled dates on each card
   - "Default" badge on the default card
   - 3-dot menu options: Schedule, Set as Default, Edit, Delete

3. **DesignCard updates**
   - Display scheduling info
   - Visual indicator for scheduled vs active vs inactive

### Backend Tasks
1. **Database changes**
   - Extend `card_designs` table:
   ```sql
   ALTER TABLE card_designs ADD COLUMN scheduled_start_at TIMESTAMPTZ;
   ALTER TABLE card_designs ADD COLUMN scheduled_end_at TIMESTAMPTZ;
   ALTER TABLE card_designs ADD COLUMN is_default BOOLEAN DEFAULT false;

   -- Only one default per business
   CREATE UNIQUE INDEX idx_card_designs_default
   ON card_designs (business_id) WHERE is_default = true;
   ```

2. **API changes**
   - `PUT /designs/{business_id}/{design_id}` - Add scheduling fields
   - `POST /designs/{business_id}/{design_id}/set-default` - Mark as default
   - `GET /designs/{business_id}/schedule` - Get scheduling timeline

3. **Background job / Cron**
   - Check for scheduled activations every minute
   - Activate designs when `scheduled_start_at <= now()` and not active
   - Deactivate designs when `scheduled_end_at < now()`, activate default
   - Options: Celery, APScheduler, or Supabase Edge Functions

### Files to create:
- `web/src/components/loyalty-program/ScheduleDialog.tsx`
- `backend/app/services/scheduler.py` - Scheduling logic

### Files to modify:
- `backend/database/schema.py` - Add migrations
- `backend/app/routers/designs.py` - Add scheduling endpoints
- `web/src/api/designs.ts` - Add scheduling functions
- `web/src/types/design.ts` - Add scheduling fields
- `web/src/components/design/DesignCard.tsx` - Show schedule info
- `web/src/components/loyalty-program/CardDesignsGrid.tsx`

### Verification
- Pro user can schedule card for future date
- Card automatically activates at scheduled time
- Card automatically deactivates and reverts to default
- Calendar shows existing schedules, prevents conflicts
- Pay user doesn't see scheduling options

---

## Phase 7: Edit Rate Limiting

### Goal
Enforce plan-based limits on how often designs can be edited.

### Frontend Tasks
1. **Edit limit feedback**
   - Show remaining edits for Pay users
   - Disable save button when limit reached
   - Display next available edit time
   - Upgrade prompt

### Backend Tasks
1. **Database changes**
   - Extend `card_designs` table:
   ```sql
   ALTER TABLE card_designs ADD COLUMN last_edited_at TIMESTAMPTZ;
   ALTER TABLE card_designs ADD COLUMN edits_today INTEGER DEFAULT 0;
   ALTER TABLE card_designs ADD COLUMN edit_date DATE;
   ```

2. **API changes**
   - `PUT /designs/{business_id}/{design_id}` - Check edit limits
   - Logic:
     ```python
     if subscription_tier == "pay":
         if edit_date == today and edits_today >= 1:
             raise HTTPException(429, "Edit limit reached. Try again tomorrow.")
         # Reset counter if new day
         if edit_date != today:
             edits_today = 0
             edit_date = today
         edits_today += 1
     ```

3. **Response enhancement**
   - Include `edits_remaining` and `next_edit_available` in response

### Files to modify:
- `backend/database/schema.py` - Add migrations
- `backend/app/routers/designs.py` - Add rate limiting
- `web/src/app/(dashboard)/design/[id]/page.tsx` - Show limit info
- `web/src/components/design/DesignEditorV2.tsx` - Disable when limited

### Verification
- Pay user can edit once per day
- Second edit attempt shows error with next available time
- Pro user has unlimited edits
- Counter resets at midnight

---

## Summary: Implementation Order

| Phase | Feature | Effort | Dependencies |
|-------|---------|--------|--------------|
| 1 | Core Page Restructure | ✅ Done | None |
| 2 | Customer Data Collection | 4-5 hours | Phase 1 |
| 3 | Business URL Management | 3-4 hours | Phase 1 |
| 4 | Locations & Geofencing | 6-8 hours | Phase 1 |
| 5 | Notification Templates | 4-5 hours | Phase 1 |
| 6 | Card Scheduling | 6-8 hours | Phase 1 |
| 7 | Edit Rate Limiting | 2-3 hours | Phase 1 |

**Recommended order:** 2 → 3 → 5 → 7 → 4 → 6

This order prioritizes:
1. Simpler features first to validate the architecture
2. Features that don't require new database tables
3. Features that build on each other

---

## Testing Checklist

### Per-phase testing:
- [ ] Feature works for Pay plan with appropriate restrictions
- [ ] Feature works for Pro plan with full capabilities
- [ ] Settings persist across page reloads
- [ ] Error states are handled gracefully
- [ ] Loading states are shown appropriately
- [ ] Mobile responsive layout works

### End-to-end testing:
- [ ] New business onboarding includes data collection setup
- [ ] Customer registration respects business config
- [ ] Passes include location data when configured
- [ ] Notifications use custom templates
- [ ] Scheduled cards activate/deactivate correctly
- [ ] Rate limits are enforced correctly

---

## Notes

- All backend changes use Supabase (PostgreSQL)
- Frontend uses Next.js 16 with App Router
- UI components from shadcn/ui
- Icons from Phosphor Icons
- The existing `businesses.settings` JSONB field is used for most config to avoid schema changes where possible
