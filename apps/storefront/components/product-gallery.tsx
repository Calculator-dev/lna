"use client"
import Image from "next/image"
import { isSvg } from "@/lib/products"
import { useState } from "react"
import { useTranslations } from "next-intl"
import type { Locale, MediaAsset } from "@/lib/products"

export function ProductGallery({ images, locale }: { images: MediaAsset[]; locale: Locale }) {
  const t = useTranslations("product")
  const [selected, setSelected] = useState(0)
  const current = images[selected] ?? images[0]
  return <div className="min-w-0 self-start">
    <div className="relative aspect-square overflow-hidden bg-[#f4f4f2]"><Image unoptimized={isSvg(current.url)} src={current.url} alt={current.alt[locale]} fill priority sizes="(min-width: 1024px) 55vw, 100vw" className="object-contain p-3 sm:p-7" /></div>
    {images.length > 1 && <div className="mt-3 flex gap-3 overflow-x-auto pb-1 scrollbar-none [&::-webkit-scrollbar]:hidden">{images.map((image, index) => <button key={image.id} type="button" aria-label={t("showImage", { number: index + 1 })} aria-pressed={selected === index} onClick={() => setSelected(index)} className={`relative h-20 w-20 shrink-0 overflow-hidden border ${selected === index ? "border-foreground" : "border-border"}`}><Image unoptimized={isSvg(image.url)} src={image.url} alt={image.alt[locale]} fill sizes="80px" className="object-cover" /></button>)}</div>}
  </div>
}
