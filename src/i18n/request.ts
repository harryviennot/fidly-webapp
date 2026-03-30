import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";

export default getRequestConfig(async () => {
  const store = await cookies();
  const cookieLocale = store.get("NEXT_LOCALE")?.value;
  const locale = ["en", "fr"].includes(cookieLocale!) ? cookieLocale! : "en";

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
      ...(await import(`../../messages/${locale}/billing.json`)).default,
      ...(await import(`../../messages/${locale}/features.json`)).default,
    },
  };
});
