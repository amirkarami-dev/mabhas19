import "@testing-library/jest-dom/vitest";

// Ant Design uses window.matchMedia (via useBreakpoint) which jsdom doesn't provide.
// Provide a minimal stub so Antd layout components render without throwing.
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  }),
});
