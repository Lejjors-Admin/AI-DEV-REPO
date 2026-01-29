# Enterprise Account Sync - Frontend

A modern React-based frontend application for accounting and practice management, built with TypeScript, Vite, and Tailwind CSS.

## Features

- **Modern React Architecture**: Built with React 18, TypeScript, and modern hooks
- **Responsive UI**: Mobile-first design with Tailwind CSS
- **Component Library**: Comprehensive UI components using Radix UI and shadcn/ui
- **State Management**: TanStack Query for server state and React Context for app state
- **Routing**: Lightweight client-side routing with Wouter
- **Form Handling**: React Hook Form with Zod validation
- **Charts & Visualization**: Recharts for financial data visualization

## Tech Stack

- **React 18** + **TypeScript**
- **Vite** (build tool and dev server)
- **Tailwind CSS** (styling)
- **Radix UI** + **shadcn/ui** (UI components)
- **TanStack Query** (data fetching and caching)
- **Wouter** (routing)
- **React Hook Form** + **Zod** (forms and validation)
- **Framer Motion** (animations)
- **Lucide React** (icons)

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser and navigate to `http://localhost:3000`

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run check` - Run TypeScript type checking

## Project Structure

```
├── src/
│   ├── components/         # Reusable UI components
│   │   ├── ui/            # Base UI components (shadcn/ui)
│   │   ├── layout/        # Layout components
│   │   ├── journal/       # Journal entry components
│   │   ├── financial/     # Financial components
│   │   ├── dashboard/     # Dashboard components
│   │   ├── binder/        # Audit binder components
│   │   ├── crm/           # CRM components
│   │   └── ...            # Other feature components
│   ├── pages/             # Route components
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Utilities and configurations
│   └── main.tsx           # Application entry point
├── index.html             # HTML template
├── package.json           # Dependencies and scripts
├── vite.config.ts         # Vite configuration
├── tsconfig.json          # TypeScript configuration
└── tailwind.config.ts     # Tailwind CSS configuration
```

## Key Components

### Core Features
- **Dashboard**: Overview with key metrics and recent activity
- **Client Management**: Client selection and management interface
- **Financial Data**: Modern bookkeeping interface
- **Transaction Manager**: Advanced transaction handling
- **Reports**: Comprehensive financial reporting
- **Journal Entries**: Complete journal entry system
- **Audit Binder**: Digital audit file management
- **AI Integration**: Milton AI chat interface

### UI Components
- **47+ shadcn/ui components**: Button, Card, Dialog, Form, Input, Select, Table, Toast, etc.
- **Custom business components**: Specialized accounting and CRM components
- **Responsive layouts**: Mobile-first design with collapsible sidebars
- **Accessibility**: ARIA-compliant components

## Development

### Code Style
- TypeScript for type safety
- ESLint and Prettier for code quality
- Component-based architecture
- Custom hooks for reusable logic

### State Management
- **TanStack Query**: Server state management and caching
- **React Context**: Authentication and app-wide state
- **Local State**: useState and useReducer for component state

### Styling
- **Tailwind CSS**: Utility-first CSS framework
- **CSS Variables**: Theme customization
- **Responsive Design**: Mobile-first approach
- **Dark Mode**: Theme switching support

## Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory, ready for deployment to any static hosting service.

## License

MIT License

Cursor connection test