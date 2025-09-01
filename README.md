# Restaurant Online Ordering Platform

A modern, responsive restaurant ordering platform built with React, TypeScript, and Tailwind CSS.

## Features

- 🍱 Dynamic menu loading from API
- 🛒 Full shopping cart functionality
- 🔍 Real-time search across menu items
- 📱 Responsive design for all devices
- 🎨 Beautiful dark theme with smooth animations
- 🐳 Docker containerization support

## Getting Started

### Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### Docker Development

```bash
# Run development environment
docker-compose --profile dev up --build

# Or run production build
docker-compose up --build
```

### Docker Commands

```bash
# Build production image
docker build -t restaurant-app .

# Run production container
docker run -p 3000:80 restaurant-app

# Build development image
docker build -f Dockerfile.dev -t restaurant-app-dev .

# Run development container
docker run -p 5173:5173 -v $(pwd):/app restaurant-app-dev
```

## API Integration

The application fetches menu data from:
```
https://097zxtivqd.execute-api.ca-central-1.amazonaws.com/PROD/getMenuItem
```

Expected API response format:
```json
{
  "body": "[{\"ItemNumber\":\"1\",\"ItemName\":\"Gyoza\",\"ItemDescription\":\"Pan-fried dumplings\",\"Price\":8.00,\"Category\":\"Appetizer\"}]"
}
```

## Project Structure

```
src/
├── components/          # React components
├── contexts/           # React contexts for state management
├── utils/              # Utility functions
├── types.ts           # TypeScript type definitions
└── App.tsx            # Main application component
```

## Technologies Used

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **React Query** - Data fetching and caching
- **Lucide React** - Icons
- **Vite** - Build tool
- **Docker** - Containerization
- **Nginx** - Production web server