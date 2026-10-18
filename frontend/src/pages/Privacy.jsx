import { Link } from "react-router-dom";
import { useSeo } from "../useSeo";

const CONTACT = "privacy@pickleandpan.com";
const UPDATED = "14 October 2026";

function Section({ title, children }) {
  return (
    <section className="space-y-3">
      <h2 className="pt-4 text-2xl font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export function Privacy() {
  useSeo({
    title: "Privacy policy",
    description: "What personal data Pickle & Pan stores, why, who processes it, how long it is kept and how to download or delete your data.",
  });

  return (
    <article className="mx-auto max-w-3xl px-4 py-14 leading-relaxed sm:px-6 [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1.5">
      <header className="border-b pb-6">
        <h1 className="text-4xl font-semibold sm:text-5xl">Privacy policy</h1>
        <p className="mt-3 text-muted-foreground">Last updated: {UPDATED}</p>
      </header>

      <div className="mt-8 space-y-6 text-[17px]">
        <p>
          Pickle &amp; Pan (pickleandpan.com) is a recipe blog run by Colin Delsink in the Netherlands. This page
          explains what personal data the site stores, why, and what you can do about it. We keep it to what the site
          needs to work. We never sell your data and we don't show ads.
        </p>
        <p>
          Questions or requests? Email{" "}
          <a href={`mailto:${CONTACT}`} className="font-medium text-primary hover:underline">{CONTACT}</a>.
        </p>

        <Section title="Browsing without an account">
          <p>You can read every recipe without an account. While you browse:</p>
          <ul>
            <li>
              <strong>Analytics:</strong> we use Vercel Web Analytics to count page visits. It uses no cookies, does not
              follow you across websites and doesn't build a profile of you; we only see totals, such as how many people
              viewed a page.
            </li>
            <li>
              <strong>View counts:</strong> each recipe shows how often it was viewed. This is an anonymous counter.
            </li>
            <li>
              <strong>Technical logs:</strong> like every website, our hosting providers briefly keep technical logs
              (such as IP addresses) to run the service and protect it against abuse.
            </li>
          </ul>
        </Section>

        <Section title="If you create an account">
          <p>We store:</p>
          <ul>
            <li>your <strong>name</strong> and <strong>email address</strong>;</li>
            <li>your <strong>password</strong>, only as a secure one-way hash (nobody, including us, can read it);</li>
            <li>when you joined, your role (reader, editor or admin) and whether you confirmed your email address;</li>
            <li>the recipes you <strong>save</strong>, and the <strong>ratings</strong> you give (others only see each recipe's average, not who rated what);</li>
            <li>
              your <strong>comments</strong>, which are public and shown with your name;
            </li>
            <li>for editors: the <strong>recipes you publish</strong>, which are public and shown with your name.</li>
          </ul>
          <p>
            We use this only to run your account and the features you use. The legal basis is the agreement between us
            when you create an account (article 6(1)(b) GDPR).
          </p>
          <p>
            We email you to confirm your address or reset your password. If you ticked the box (when signing up or in
            your account settings), we also email you when a new recipe is published. That's based on your consent
            (article 6(1)(a) GDPR): every email has a one-click unsubscribe link, and you can turn it off in your account
            settings at any time. We don't send other marketing.
          </p>
        </Section>

        <Section title="Security">
          <p>
            To stop people guessing passwords or flooding the site, we briefly use your IP address and the email address
            you type to count login, sign-up and password-reset attempts. These counts are kept in memory for at most an
            hour and then disappear. This is based on our legitimate interest in keeping accounts safe (article 6(1)(f)
            GDPR).
          </p>
        </Section>

        <Section title="Cookies and browser storage">
          <p>Pickle &amp; Pan uses one cookie, and only when you sign in:</p>
          <ul>
            <li>
              <strong>pp_session</strong> keeps you signed in. It lasts 30 days (renewed while you keep using the
              site) and is removed when you log out. It can't be read by scripts on the page and is only sent to our own
              server over a secure connection.
            </li>
          </ul>
          <p>
            For editors, an unfinished <strong>recipe draft</strong> is also kept in the browser, so a refresh doesn't
            lose your work.
          </p>
          <p>
            Both are needed for the site to work, so they don't require consent. We don't use tracking or advertising
            cookies.
          </p>
        </Section>

        <Section title="Who processes your data">
          <p>We use these services to run the site. They only process data on our behalf:</p>
          <ul>
            <li><strong>MongoDB Atlas</strong>: the database with accounts, recipes and comments;</li>
            <li><strong>Amazon Web Services (S3)</strong>: recipe photos and daily database backups, stored in the EU (Stockholm);</li>
            <li><strong>Render</strong>: runs the server behind the site;</li>
            <li><strong>Vercel</strong>: hosts the website and provides the cookie-free analytics;</li>
            <li><strong>Resend</strong>: sends the confirmation, password-reset and new-recipe emails.</li>
          </ul>
          <p>
            Some of these companies are based in the United States. Where data leaves the EU, they protect it with the
            European Commission's Standard Contractual Clauses or the EU–US Data Privacy Framework.
          </p>
        </Section>

        <Section title="How long we keep it">
          <ul>
            <li>Account data: until you delete your account.</li>
            <li>Comments: until you or the recipe's author delete them, or you delete your account.</li>
            <li>Email confirmation links work for 24 hours and password-reset links for 1 hour.</li>
            <li>
              Backups: a copy of the database is made every day and kept for 30 days, so after you delete your account
              your data disappears from the backups within 30 days.
            </li>
          </ul>
        </Section>

        <Section title="Your rights">
          <p>You have the right to see, correct, download and delete your data, and to object to how we use it.</p>
          <ul>
            <li>
              <strong>Download your data</strong> or <strong>delete your account</strong> yourself, any time, on your{" "}
              <Link to="/profile" className="font-medium text-primary hover:underline">account page</Link>.
            </li>
            <li>For anything else, such as correcting your name or email, email {CONTACT}. We reply within a month.</li>
          </ul>
          <p>
            When you delete your account, your account, saved recipes, ratings and comments are removed. Recipes you published as an editor stay online, but are credited to "Former contributor" instead of
            your name. Want them removed too? Just ask.
          </p>
          <p>
            Not happy with how we handle your data? You can complain to the Dutch data protection authority, the{" "}
            <a
              href="https://autoriteitpersoonsgegevens.nl"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-primary hover:underline"
            >
              Autoriteit Persoonsgegevens
            </a>
            . We'd appreciate hearing from you first.
          </p>
        </Section>

        <Section title="Children">
          <p>Accounts are meant for people aged 16 and over. Anyone can read the recipes without an account.</p>
        </Section>

        <Section title="Changes">
          <p>
            If we change how we handle personal data, we'll update this page and the date at the top. For important
            changes we'll email account holders.
          </p>
        </Section>
      </div>
    </article>
  );
}
