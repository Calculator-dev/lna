"use client"
import Image from "next/image"
import { useState } from "react"
import { useTranslations } from "next-intl"
import { materialStyle } from "@/lib/material-style"
import { isSvg, type Locale, type Material, type MediaAsset } from "@/lib/products"
import { cn } from "@/lib/utils"

export function ProductGallery({ images, locale, material }: { images: MediaAsset[]; locale: Locale; material: Material }) {
  const t = useTranslations("product")
  const [selected, setSelected] = useState(0)
  const current = images[selected] ?? images[0]
  return <div className="min-w-0 self-start">
    <div className={cn("relative aspect-square overflow-hidden rounded-4xl", materialStyle[material].surface)}><Image unoptimized={isSvg(current.url)} src={current.url} alt={current.alt[locale]} fill priority sizes="(min-width: 1024px) 55vw, 100vw" className="object-contain p-4 sm:p-8" /></div>
    {images.length > 1 && <div className="mt-3 flex gap-3 overflow-x-auto pb-1 scrollbar-none [&::-webkit-scrollbar]:hidden">{images.map((image, index) => <button key={image.id} type="button" aria-label={t("showImage", { number: index + 1 })} aria-pressed={selected === index} onClick={() => setSelected(index)} className={cn("relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl ring-2 ring-offset-2 ring-offset-background transition", selected === index ? "ring-primary" : "ring-transparent opacity-70 hover:opacity-100")}><Image unoptimized={isSvg(image.url)} src={image.url} alt={image.alt[locale]} fill sizes="80px" className="object-cover" /></button>)}</div>}
  </div>
}
