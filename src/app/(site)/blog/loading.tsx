import { Container } from "@/components/ui/container";

export default function BlogLoading() {
  return <><div className="h-[390px] animate-pulse bg-near-black motion-reduce:animate-none" /><Container className="max-w-5xl py-14"><div className="h-[340px] animate-pulse rounded-xl bg-soft-gray motion-reduce:animate-none" /><div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }, (_, index) => <div key={index} className="h-[390px] animate-pulse rounded-xl bg-soft-gray motion-reduce:animate-none" />)}</div></Container></>;
}

