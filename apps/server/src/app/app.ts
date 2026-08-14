import express, { type Request, type Response } from 'express'
import helmet from 'helmet'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import compression from 'compression'
import hpp from 'hpp'
import requestLogger from '@/app/middleware/request/request-logger.middleware.js'
import sanitizeRequest from '@/app/middleware/sanitize.middleware.js'
import requestTimeout from '@/app/middleware/request/request-timeout.middleware.js'
import { getIsShuttingDown } from '@/infra/lib/state/shutdown-state.lib.js'
import { env } from '@/infra/core/config/env.config.js'
import apiRouter from '@/app/routes.js'
import { toNodeHandler } from 'better-auth/node'
import { adminAuth } from '@/infra/modules/auth/admin-auth.lib.js'
import {
  errorHandler,
  notFoundHandler,
} from '@/app/middleware/error-handler.middleware.js'

const app = express()

// Trust the first hop (your reverse proxy/load balancer) so req.ip reflects
// the real client address instead of the proxy's — required for the rate
// limiter below to key off actual clients rather than one shared IP.
// Adjust the hop count (or use a CIDR list) if you sit behind more than
// one proxy layer.
app.set('trust proxy', 1)

// Helmet sets secure HTTP headers first so they attach to every response,
// including error responses — must run before any other middleware. CSP
// and other directives are set explicitly (rather than relying on Helmet's
// defaults) so allowed sources are a deliberate, reviewed choice instead of
// an implicit behavior change on a future Helmet version bump
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        // JSON API serves no scripts/styles/images of its own — deny by
        // default rather than inheriting Helmet's browser-oriented defaults
        scriptSrc: ["'none'"],
        styleSrc: ["'none'"],
        imgSrc: ["'none'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    // Only meaningful once this service is reachable directly over HTTPS —
    // if TLS terminates at a reverse proxy/load balancer instead, set HSTS
    // there and remove this to avoid duplicate/conflicting headers
    hsts: {
      maxAge: 31_536_000,
      includeSubDomains: true,
      preload: true,
    },
    crossOriginResourcePolicy: { policy: 'same-origin' },
  }),
)

// CORS_ORIGIN is a comma-separated allowlist; '*' only when unset so local
// dev isn't blocked without explicit configuration
const corsOrigins = env.CORS_ORIGIN
  ? env.CORS_ORIGIN.split(',').map((origin) => origin.trim())
  : '*'
app.use(
  cors({
    origin: corsOrigins,
    credentials: true,
  }),
)

// Better Auth needs the raw request stream — mounted before express.json()
// so its handler receives an unparsed body; it has its own internal rate
// limiting, separate from the global limiter registered below. Routes
// admin-portal traffic to the independent adminAuth instance, which sets
// the 'admin.session_token' cookie.
app.all('/api/admin-auth/*splat', toNodeHandler(adminAuth))

// Global IP-based rate limit runs before body parsing/auth so abusive
// clients are rejected with 429 before their payload is even parsed
const limiter = rateLimit({
  windowMs: Number(env.RATE_LIMIT_WINDOW_MS),
  max: Number(env.RATE_LIMIT_MAX),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
})

app.use(limiter)

// Compress responses after rate limiting so throttled clients don't pay the
// CPU cost of gzip on requests that get rejected anyway
app.use(compression())

// Registered before body parsing so even requests that fail JSON parsing
// (malformed payloads) still get a correlation id and a logged status code
app.use(requestLogger)

// Bounds total time spent in application code, independent of the
// Node-level requestTimeout/headersTimeout set in server.ts — those guard
// the socket, this guards the handler. Registered here so a timed-out
// request still logs through requestLogger's 'finish' handler.
app.use(requestTimeout)

// BODY_LIMIT caps request payload size to prevent memory-exhaustion DoS via
// oversized request bodies; parse before any route handler sees the body
app.use(express.json({ limit: env.BODY_LIMIT }))
app.use(express.urlencoded({ extended: true, limit: env.BODY_LIMIT }))

// Must run after body/query parsing (needs parsed objects to inspect) and
// before any route handler touches req.body/query/params
app.use(hpp())
app.use(sanitizeRequest)

// Liveness probe: confirms only that the Node.js process is running and
// the event loop is responsive — must stay dependency-free (no DB/cache
// checks) so a slow downstream dependency never causes a false-negative
// restart of an otherwise-healthy process
app.get('/health/live', (_req, res) => {
  res.json({ status: 'ok' })
})

// Readiness probe: tells the load balancer whether this instance should
// receive traffic. Returns 503 while gracefulShutdown (server.ts) is
// draining connections, so the LB deregisters this instance before the
// socket actually closes rather than after
app.get('/health/ready', (_req, res) => {
  if (getIsShuttingDown()) {
    res.status(503).json({ status: 'shutting_down' })
    return
  }
  res.json({ status: 'ok' })
})

// Root route provides minimal API entry point for developers testing the server
// Returns basic service info without exposing any sensitive details
app.get('/', (_req: Request, res: Response) => {
  res.json({
    message: 'Hello World',
    status: 'running',
    version: '1.0.0',
  })
})

// All feature routes are wired through the single apiRouter and mounted
// under a version prefix so a future /api/v2 doesn't require touching
// individual feature routers
app.use('/api/v1', apiRouter)

// Catch-all for unmatched routes — must be registered after all other routes
// so it only fires when nothing else handled the request
app.use(notFoundHandler)

// Centralized error handler — must be registered last so Express recognizes
// it as error-handling middleware (4-arg signature) and routes all next(err) here
app.use(errorHandler)

export default app
