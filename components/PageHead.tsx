import Head from 'expo-router/head';

// Sets the browser tab title per screen on web — expo-router's <Head> is a
// thin wrapper over react-helmet-async, already provided at the app root
// (expo-router/entry wraps the whole tree in Head.Provider automatically,
// no setup needed here) and scoped to the focused screen, so navigating
// between tabs updates the title correctly without one screen's title
// leaking into another's.
//
// Found via an axe-core accessibility sweep: every route shipped with an
// empty <title>, which fails WCAG 2.4.2 (Page Titled) — a screen-reader or
// many-open-tabs user has no way to tell pages apart. Renders nothing
// visually; safe to place anywhere in a screen's tree, most simply as the
// first child of the root element.
export default function PageHead({ title }: { title: string }) {
  return (
    <Head>
      <title>{title} · Hiyame</title>
    </Head>
  );
}
