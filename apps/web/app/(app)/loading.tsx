export default function AppLoading() {
  return (
    <div
      className="fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden bg-transparent"
      role="progressbar"
      aria-label="Loading page"
    >
      <span className="block h-full w-1/3 animate-route-sweep bg-accent" />
    </div>
  );
}
