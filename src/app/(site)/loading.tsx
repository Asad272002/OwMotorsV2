import { Container } from "@/components/ui/container";

export default function SiteLoading() {
  return <div aria-busy="true" aria-label="Loading OW Motors content" className="min-h-[calc(100vh-4rem)] min-h-[calc(100dvh-4rem)] bg-white py-16"><Container className="max-w-5xl"><div className="h-3 w-24 animate-pulse bg-border motion-reduce:animate-none" /><div className="mt-5 h-12 max-w-lg animate-pulse bg-soft-gray motion-reduce:animate-none" /><div className="mt-4 h-5 max-w-2xl animate-pulse bg-soft-gray motion-reduce:animate-none" /><div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{[1, 2, 3].map((item) => <div key={item} className="h-72 animate-pulse border border-border bg-soft-gray motion-reduce:animate-none" />)}</div><span className="sr-only">Loading…</span></Container></div>;
}
