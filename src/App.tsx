/*
 * App.tsx
 *
 * Root React component. Its only responsibility is to hand control over to
 * React Router by providing the pre-built router configuration from Routes.tsx.
 *
 * All page-level rendering decisions (which component to show for a given URL)
 * are delegated to the router — this file intentionally stays thin.
 */

import { RouterProvider } from 'react-router-dom';
import { router } from './Routes';

export default function App() {
  // RouterProvider listens for URL changes and renders the matching page component.
  return <RouterProvider router={router} />;
}

// Development scratch note — not used at runtime.
//<Component propName={value} />