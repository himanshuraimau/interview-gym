import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { toNodeHandler } from 'better-auth/node'
import { auth } from './config/auth.js'

const app = express()
const port = process.env.PORT || 3000

// Enable CORS
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:8081',
    'exp://192.168.1.x:8081', // Update with your local IP for Expo
  ],
  credentials: true,
}))

// Better Auth handler - Mount BEFORE express.json()
// For Express v5: use {*} syntax for wildcard
app.use('/api/auth', toNodeHandler(auth))

// Mount express.json() AFTER Better Auth handler
app.use(express.json())

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Test Better Auth is working
app.get('/api/auth/ok', async (req, res) => {
  res.json({ message: 'Better Auth is running!' })
})

app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`)
  console.log(`🔐 Auth endpoints: http://localhost:${port}/api/auth/*`)
  console.log(`📊 Health check: http://localhost:${port}/api/health`)
})
