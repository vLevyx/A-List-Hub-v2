# A-List ELAN Hub - Next.js Migration

A modern, high-performance Next.js application with TypeScript and Supabase integration for the A-List ELAN Hub gaming platform.

## 🚀 Features

- **Next.js 14** with App Router and TypeScript
- **Supabase Integration** with real-time subscriptions
- **Discord OAuth Authentication**
- **Real-time User Access Management**
- **Page Analytics & Session Tracking**
- **Mobile-Optimized Design**
- **Performance Optimized** (Target Lighthouse Score: 90+)

## 🛠️ Tech Stack

- **Framework**: Next.js 14 with TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth with Discord OAuth
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Deployment**: Vercel

## 📦 Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy environment variables:
   ```bash
   cp .env.local.example .env.local
   ```

4. Update `.env.local` with your Supabase credentials

5. Run the development server:
   ```bash
   npm run dev
   ```

## 🔧 Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## 🏗️ Project Structure

```
src/
├── app/                 # Next.js App Router
├── components/          # Reusable UI components
├── hooks/              # Custom React hooks
├── lib/                # Utility functions and configurations
└── types/              # TypeScript type definitions
```

## 🔐 Authentication Flow

1. User clicks "Login with Discord"
2. Redirected to Discord OAuth
3. Returns to `/auth/callback` with auth code
4. Session established and user data synced
5. Real-time access permissions monitored

## 📊 Database Schema

The application uses the existing Supabase schema with tables:
- `users` - User profiles and access control
- `user_blueprints` - User blueprint selections
- `page_sessions` - Analytics and session tracking
- `admin_logs` - Administrative action logging

## 🚀 Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Manual Deployment

```bash
npm run build
npm start
```

## 🎯 Performance Optimizations

- **Image Optimization**: Next.js Image component with WebP/AVIF
- **Code Splitting**: Dynamic imports for heavy components
- **Caching**: Aggressive caching strategies
- **Bundle Analysis**: Optimized package imports
- **Compression**: Built-in Gzip compression

## 🔄 Real-time Features

- **User Access Changes**: Instant updates when permissions change
- **Session Tracking**: Real-time page analytics
- **Authentication State**: Live auth status updates

## 📱 Mobile Optimization

- **Responsive Design**: Mobile-first approach
- **Touch Interactions**: Optimized for touch devices
- **Performance**: Fast loading on mobile networks
- **PWA Ready**: Service worker support

## 🧪 Development

```bash
# Development server
npm run dev

# Type checking
npm run type-check

# Build for production
npm run build

# Start production server
npm start

# Linting
npm run lint
```

## 📈 Analytics & Monitoring

The application includes comprehensive analytics:
- Page visit tracking
- Session duration monitoring
- User engagement metrics
- Real-time dashboard for admins

## 🔒 Security Features

- **Row Level Security**: Database-level access control
- **Real-time Access Monitoring**: Instant permission updates
- **Secure Authentication**: Discord OAuth with Supabase
- **CSRF Protection**: Built-in Next.js security

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is proprietary software owned by The A-List team.

## 🆘 Support

For support, contact the development team or create an issue in the repository.