import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { SUPPORTED_LOCALES, DEFAULT_LOCALE } from "@/lib/locale";

export default getRequestConfig(async () => {
  const store = await cookies();
  const cookieLocale = store.get("NEXT_LOCALE")?.value;
  const locale = (SUPPORTED_LOCALES as readonly string[]).includes(cookieLocale!)
    ? cookieLocale!
    : DEFAULT_LOCALE;

  return {
    locale,
    messages: {
      ...(await import(`../../messages/${locale}/common.json`)).default,
      ...(await import(`../../messages/${locale}/account.json`)).default,
      ...(await import(`../../messages/${locale}/settings.json`)).default,
      ...(await import(`../../messages/${locale}/team.json`)).default,
      ...(await import(`../../messages/${locale}/customers.json`)).default,
      ...(await import(`../../messages/${locale}/design-editor.json`)).default,
      ...(await import(`../../messages/${locale}/loyalty-program.json`)).default,
      ...(await import(`../../messages/${locale}/auth.json`)).default,
      ...(await import(`../../messages/${locale}/activity.json`)).default,
      ...(await import(`../../messages/${locale}/dashboard.json`)).default,
      ...(await import(`../../messages/${locale}/achievements.json`)).default,
      ...(await import(`../../messages/${locale}/billing.json`)).default,
      ...(await import(`../../messages/${locale}/features.json`)).default,
      ...(await import(`../../messages/${locale}/notifications.json`)).default,
      ...(await import(`../../messages/${locale}/businessesPage.json`)).default,
      ...(await import(`../../messages/${locale}/impersonation.json`)).default,
      ...(await import(`../../messages/${locale}/onboarding-business.json`)).default,
      ...(await import(`../../messages/${locale}/pricing.json`)).default,
      ...(await import(`../../messages/${locale}/changelog.json`)).default,
    },
  };
});
