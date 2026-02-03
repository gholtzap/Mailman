require('@testing-library/jest-dom')

process.env.CLERK_SECRET_KEY = 'test_secret_key'
process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'test_publishable_key'
process.env.API_KEY_ENCRYPTION_SECRET = 'test_encryption_secret_32_chars_long'
process.env.CRON_SECRET = 'test_cron_secret'
process.env.RESEND_API_KEY = 'test_resend_key'
process.env.FROM_EMAIL = 'test@example.com'
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
process.env.CLERK_WEBHOOK_SECRET = 'test_webhook_secret'

jest.setTimeout(30000)
