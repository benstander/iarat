# State Components

This directory contains the individual state components for the Reelmixer application.

## Components

### `LandingPage.tsx`
- Initial landing page with input for lecture links and file uploads
- Handles the "Convert to Brainrot" functionality
- Shows background video preview

### `TopicsPage.tsx`
- Shows extracted topics from the uploaded content
- Allows users to select which topics to include in the video
- Multi-select with visual feedback

### `CustomisePage.tsx`
- Video customization options:
  - Video Format (Summary, Split Screen, Quiz)
  - Background Video (Minecraft Parkour, Subway Surfers, Characters)
  - Video Style (Brainrot, Academic, Unhinged)
- Triggers video generation

### `FinishedPage.tsx`
- Shows the final generated video
- Provides download and "Create Another" options
- Success state with video player

## Types

### `types.ts`
Contains shared TypeScript interfaces and types used across all state components:
- `TopicSummary`
- `VideoResult`
- `AppState`
- `VideoFormat`
- `BackgroundVideo`
- `VideoStyle`

## Usage

Import individual components:
```tsx
import LandingPage from '@/components/states/LandingPage'
```

Or use the index file:
```tsx
import { LandingPage, TopicsPage } from '@/components/states'
```

## State Flow

1. **Landing** → User uploads content
2. **Topics** → User selects topics to include
3. **Customise** → User configures video options
4. **Finished** → User views and downloads result 