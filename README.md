# CardStyleGenUI

CardStyleGenUI is a React Native application that implements the A2UI (Agent to UI) protocol for dynamic, streaming UI generation.

## Features

- **Streaming UI**: Updates the user interface in real-time using Server-Sent Events (SSE).
- **A2UI Protocol**: Fully compatible with the A2UI specification for declarative UI definitions.
- **Cross-Platform**: Built with React Native, supporting both Android and iOS.
- **GenUI Integration**: Designed to work with GenUI server components for AI-driven UI experiences.

## Getting Started

### Prerequisites

- Node.js >= 20
- React Native development environment (Android Studio / Xcode)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/demomylove/personalGenui.git
   ```
2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

### Running the App

Start the Metro Bundler:

```bash
npm start
```

Run on Android:

```bash
npm run android
```

Run on iOS:

```bash
npm run ios
```

## Architecture

This project uses `@ag-ui/client` to render the UI DSL received from the server. It connects to a backend service that streams partial UI updates, allowing for a responsive and interactive user experience driven by backend logic or AI models.
