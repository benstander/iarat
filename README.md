recaps 
ffmpeg 

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
