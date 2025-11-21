<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1SFe46YN258vtwo28ukpmbuwenES0zZ5v

## Run Locally

**Prerequisites:**  Node.js (v16 or higher)

### Installation

1. Navigate to the project directory:
   ```
   cd netviz-pro
   ```
2. Install dependencies:
   ```
   npm install
   ```
3. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
4. Run the app:
   ```
   npm run dev
   ```
5. Open browser to http://localhost:9040

### Testing

Run the test suite:
```bash
node verify_app.js && node verify_persistence.js && node verify_simulation_export.js && node test_asymmetric_routing.js
```
