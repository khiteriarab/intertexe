/**
 * Replaces the shop catalog `app/loading.tsx` skeleton on /platform.
 * Keep this empty — a product-grid pulse is what made the sales page look broken.
 */
export default function PlatformLoading() {
  return <div className="min-h-[40vh] bg-white" aria-busy="true" aria-label="Loading platform" />;
}
