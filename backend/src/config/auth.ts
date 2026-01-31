import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { expo } from '@better-auth/expo'
import prisma from './prisma.js'

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  
  // Base URL for callbacks and redirects
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:8000',
  
  // Allow requests from your frontend
  trustedOrigins: [
    'http://localhost:5173',  // Web frontend (if any)
    'http://localhost:3000',  // Alternative web port
    'exp://192.168.1.x:8081', // Expo dev server (update with your IP)
    'myapp://',               // Your mobile app scheme
  ],
  
  // Email/password authentication
  emailAndPassword: {
    enabled: true,
  },
  
  // Social providers - only enable if credentials are set
  socialProviders: process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET ? {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    },
  } : {},
  
  // Enable Expo plugin for mobile
  plugins: [
    expo(),
  ],
})

export type AuthType = {
  user: typeof auth.$Infer.Session.user | null
  session: typeof auth.$Infer.Session.session | null
}
