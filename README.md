recaps 
ffmpeg 

## Supabase Authentication Setup

### Overview
Authentication is now integrated using Supabase to protect video generation. Users can:
- Browse and customize video settings without signing in
- Must sign in or create an account to generate videos
- Sign in with email/password or Google OAuth

### Setup Instructions

1. **Create a Supabase Project**
   - Go to [supabase.com](https://supabase.com) and create a new project
   - Wait for the project to be fully initialized

2. **Configure Environment Variables**
   Create a `.env.local` file in the project root with:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   ```

3. **Find Your Supabase Credentials**
   - Go to your Supabase project dashboard
   - Navigate to Settings → API
   - Copy the Project URL and API Keys:
     - `NEXT_PUBLIC_SUPABASE_URL` = Project URL
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `anon` `public` key
     - `SUPABASE_SERVICE_ROLE_KEY` = `service_role` `secret` key

4. **Enable Authentication Providers** (Optional - for Google Auth)
   - In Supabase dashboard, go to Authentication → Providers
   - Enable Google provider and configure OAuth credentials

5. **Configure Email Settings** (Optional - for email confirmation)
   - Go to Authentication → Settings
   - Configure SMTP settings for email confirmation

### Authentication Flow
- **Landing Page**: Users can access all features
- **Customization Page**: Users can edit all settings without authentication
  - Shows a notice when on the Topics tab that sign-in is required for generation
- **Video Generation**: Triggers authentication modal if user not signed in
- **Header**: Shows sign in/up buttons or user menu with sign out option

### Components Added
- `AuthContext` (`src/lib/auth-context.tsx`): Manages authentication state
- `AuthModal` (`src/components/auth/AuthModal.tsx`): Login/signup modal
- Updated `Header` component with authentication state
- Updated `CustomisePage` with authentication notices
- Protected video generation in main app

## Progress Bar Integration

### Overview
A reusable `ProgressBar` component was added to visually indicate the user's progress through the three main states of the app: Topics selection, Customisation, and Finished video. This improves user experience by providing clear feedback on their current step.

### Component Details
- **Location:** `src/components/ui/ProgressBar.tsx`
- **Props:**
  - `currentStep` (number): The current step (1-based).
  - `totalSteps` (number): The total number of steps.
  - `showText` (boolean, optional): Whether to show "Step X of Y" text (default: true).
- **Style:**
  - Gray background bar with a pink progress indicator.
  - Rounded edges, smooth transition.
  - Uses Tailwind CSS for styling.

### Usage
The `ProgressBar` is used in the following state components:
- **LandingPage** and **TopicsPage**: `currentStep=1`, `totalSteps=3` (Step 1/3)
- **CustomisePage**: `currentStep=2`, `totalSteps=3` (Step 2/3)
- **FinishedPage**: `currentStep=3`, `totalSteps=3` (Step 3/3)

It is placed directly below the main action button on each page for maximum visibility.

### Reasoning
- Provides clear, visual feedback to users about their progress.
- Consistent UI across all main states.
- Simple, accessible, and easy to maintain.

--- 
