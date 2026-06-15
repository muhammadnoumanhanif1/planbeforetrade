import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';

/**
 * Custom render function that wraps components with necessary providers.
 * This ensures all tests have access to the same context/providers as the app.
 */
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {}

const Wrapper = ({ children }: { children: React.ReactNode }) => {
  // Add any providers your app needs here
  // Examples:
  // - Redux Provider
  // - Theme Provider
  // - Router (if testing navigation)
  // - Auth Context
  return <>{children}</>;
};

function customRender(
  ui: ReactElement,
  options?: CustomRenderOptions
) {
  return render(ui, { wrapper: Wrapper, ...options });
}

export * from '@testing-library/react';
export { customRender as render };
