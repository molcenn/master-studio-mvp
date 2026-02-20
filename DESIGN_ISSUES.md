# Master Studio - UI/UX Issues (Opus Analysis)

## HIGH PRIORITY

### 1. Status Badge Contrast
- **Location**: Project status badges (ACTIVE, REVIEW, PLANNING)
- **Issue**: Green ACTIVE badge has #10B981 text on #059669 background (contrast ratio: 2.3:1)
- **Fix**: Use #FFFFFF text for all badges, minimum 4.5:1 contrast ratio

### 2. Missing Hover/Active States
- **Location**: All interactive elements
- **Issue**: No visual feedback on hover/click
- **Fix**: Add subtle glass morphism effect or opacity change on interaction

### 3. Keyboard Navigation Missing
- **Location**: All interactive elements
- **Issue**: No focus rings or keyboard accessibility
- **Fix**: Visible focus states for keyboard users

### 4. Inconsistent Card Sizing
- **Location**: Active Projects section
- **Issue**: Top row cards have inconsistent heights (75px-85px)
- **Fix**: Uniform card sizing with consistent information hierarchy

## MEDIUM PRIORITY

### 5. Progress Bar Standardization
- **Issue**: Different colors and thickness (2px-3px)
- **Fix**: Standardized 3px thickness, color-coded by status (green=ACTIVE, orange=REVIEW, blue=PLANNING)

### 6. Vertical Spacing Inconsistency
- **Issue**: 16px gap between stat cards, 24px between project sections
- **Fix**: Uniform 20px vertical spacing throughout

### 7. Avatar Component
- **Issue**: Circular avatars 24px with inconsistent spacing
- **Fix**: Standardized 28px diameter, 6px gap

### 8. Button Height Inconsistency
- **Issue**: "Approve" and "Request Changes" buttons different heights (36px vs 38px)
- **Fix**: Uniform button height (38px) and consistent padding (12px 20px)

### 9. Glass Morphism Blur
- **Issue**: Background blur radius of 8px (too subtle)
- **Fix**: 16px-20px blur radius for proper glass effect

### 10. Inconsistent Backdrop Filter
- **Issue**: Some elements have backdrop-filter, others don't
- **Fix**: Uniform backdrop-filter: blur(16px) on all glass elements

## LOW PRIORITY

### 11. View All Button Alignment
- **Issue**: Inconsistent positioning (8px-12px from edge)
- **Fix**: Consistent 16px right margin

### 12. Timeago Formatting
- **Issue**: "0 min ago", "1 day ago" - inconsistent formatting
- **Fix**: Standardized "Just now", "X minutes ago", "X hours ago"

### 13. Missing Elevation Shadows
- **Issue**: Flat design without shadow layers
- **Fix**: Subtle shadow with 0 4px 6px rgba(0,0,0,0.1) for depth

## FILES TO MODIFY

1. `app/components/Dashboard.tsx` - Main layout, spacing
2. `app/components/Sidebar.tsx` - Navigation, hover states
3. `app/components/MainWorkspace.tsx` - Cards, project items
4. `app/components/ChatPanel.tsx` - Chat interface
5. `app/globals.css` - Global styles, CSS variables

## DESIGN SYSTEM UPDATES NEEDED

```css
/* Glass morphism standard */
--glass-blur: 16px;
--glass-saturate: 180%;
--glass-bg: rgba(20, 20, 30, 0.4);
--glass-border: rgba(255, 255, 255, 0.08);

/* Status colors */
--status-active: #10B981;
--status-review: #F59E0B;
--status-planning: #3B82F6;

/* Badge standard */
--badge-height: 24px;
--badge-padding: 6px 10px;
--badge-radius: 4px;
--badge-text: #FFFFFF;

/* Button standard */
--button-height: 38px;
--button-padding: 12px 20px;

/* Spacing */
--spacing-section: 20px;
--spacing-card: 16px;
```
