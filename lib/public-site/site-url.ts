/**
 * Where every "Back to website" / "Back to beeliv.co" link goes. The apps live on their own subdomains
 * (talent., admin., client.beeliv.co), where "/" is the app's own sign-in, so a relative "/" would loop back into the
 * app. In production the public site is https://www.beeliv.co; in local development it stays "/" (one app serves all).
 */
export const PUBLIC_SITE_HOME: string = process.env.NODE_ENV === "production" ? "https://www.beeliv.co" : "/";
