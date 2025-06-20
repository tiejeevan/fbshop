'use client';

import { SignupForm } from '@/components/auth/SignupForm';
// For a dedicated page, the loginPath would be relative to the locale
// e.g. /login if next-intl handles locale prefixing automatically for Link/router.push

export default function CustomerSignupPage() {
  return <SignupForm loginPath="/login" />;
}
