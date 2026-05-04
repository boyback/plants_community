import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen items-center justify-center px-6">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-leaf-200/40 blur-3xl" />
      </div>
      <div className="text-center">
        <div className="text-7xl">🌵</div>
        <h1 className="mt-4 text-3xl font-bold text-ink-800">404</h1>
        <p className="mt-1 text-sm text-leaf-700/70">这棵多肉可能已经搬去别的阳台了</p>
        <Link href="/" className="btn-primary mt-6 inline-flex">
          回到首页
        </Link>
      </div>
    </div>
  );
}
