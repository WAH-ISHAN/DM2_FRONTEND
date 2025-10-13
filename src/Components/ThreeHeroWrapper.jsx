"use client";

import dynamic from "next/dynamic";

const ThreeHero = dynamic(() => import("./ThreeHero"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center text-slate-270 ">
      Loading 3D…
    </div>
  ),
});

export default function ThreeHeroWrapper() {
  return <ThreeHero />;
}