import { createAuthClient } from 'better-auth/react'
import { adminClient } from 'better-auth/client/plugins'

export const authAdminClient = createAuthClient({
  // Route every admin auth API call to the dedicated /api/admin-auth
  // handler instead of the default /api/auth mounted for customers
  basePath: '/api/admin-auth',
  // adminClient() adds authAdminClient.admin.* methods (listUsers,
  // setRole, banUser, ...) mapped to the admin plugin endpoints
  // registered on the server's adminAuth instance
  plugins: [adminClient()],
  fetchOptions: {
    // Ensures 'admin.session_token' travels with every admin auth
    // request — this cookie is fully isolated from the customer
    // portal's cookie, so credentials must be explicit here too
    credentials: 'include',
    onError(context: { error: Error; response?: Response }) {
      console.error('[admin-auth] Request failed:', context.error)
      if (context.response?.status === 401) {
        console.log('[admin-auth] Session expired or not authenticated')
      }
    },
  },
})

// Re-exported individually so call sites don't need to know the client
// shape — matches how auth-client.ts re-exports the customer instance
export const { signIn, signUp, signOut, useSession } = authAdminClient
