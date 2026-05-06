# Plan: Crop Review Tool Integration

The **Crop Review Tool** is an administrative feature designed to audit and optimize how published images (especially portrait-oriented photos) are cropped into the 16:9 aspect ratio used in gameplay.

## Problem & Goal
- **Problem**: Images with an aspect ratio < 1 (portrait) often crop poorly using standard methods, frequently cutting off the vehicle and degrading the user experience.
- **Goal**: Optimize cropping so that the subject (the car) is always centered and in frame, while being mindful of Cloudinary AI credit limits.

## Components & Architecture

### Frontend UI (`app/admin/_components/CropReviewPanel.tsx`)
A dedicated review interface that allows admins to:
- Compare the **Original Frame** against three cropping methods.
- **Standard (Center)**: Basic center-crop (`f_auto,q_auto`).
- **AI-Subject**: Cloudinary's general subject-aware cropping (`g_auto:subject`).
- **Conditional COCO-v2**: The car-specific `coco_v2_car` AI model (only triggers on portrait images to conserve credits).
- Select the optimal method, skip images, or reject/deactivate them.
- Save progress automatically via `localStorage`.

### Backend API (`app/api/admin/images/review/route.ts`)
- **GET**: Fetches active images and generates signed/preview URLs for all cropping methods.
- **POST**: Persists the selected `cropMethod` or `isActive` status to the database.

### Image Logic (`app/lib/game.ts`)
- The `imageUrl` helper supports an explicit `method` parameter (`standard`, `subject`, or `conditional`) to respect the admin's choice during gameplay.

## Features & Goals
- **Optimal Framing**: Ensures the car is the focal point regardless of the original image shape.
- **Credit Efficiency**: Defaults to `conditional` logic, only calling the `coco_v2_car` AI model for portrait images to stay within the 500 monthly token limit.
- **Admin Audit Workflow**:
    - **Selection**: Hard-set the best cropping method for specific problematic images.
    - **Rejection**: Directly remove images that are too poorly framed for 16:9.
    - **Persistence**: Index tracking allows for long-running audit sessions.

## Integration Steps Completed
- [x] **Prisma Schema**: Added `CropMethod` enum and `cropMethod` field to the `Image` model.
- [x] **Image Utility**: Updated `imageUrl` to support specific cropping methods.
- [x] **API Route**: Created `GET` and `POST` handlers for the review tool.
- [x] **Admin UI**: Built the `CropReviewPanel` and wired it into the Admin navigation.
- [x] **Documentation**: Added usage instructions to the project `README.md`.

## Next Steps
1. **Database Migration**: Run `npx prisma migrate dev` to apply the `cropMethod` field.
2. **Library Audit**: Access the tool via the **Crop Review** tab in the Admin Panel to begin reviewing the image library.
