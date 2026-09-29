import { useEffect, useRef, useState, type FormEvent, type SetStateAction } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useBlocker } from "react-router";
import { ArrowLeft, PackagePlus } from "lucide-react";
import { createProduct, getCategories, updateProduct } from "../lib/api";
import { productPayload, variantDrafts, type VariantDraft } from "../lib/product-draft";
import { ProductImages } from "./product-images";
import { VariantEditor } from "./variant-editor";
import type { ProductDetails, ProductImage } from "../lib/admin-data";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card } from "./ui/card";
import { control, Field } from "./ui/field";

export function ProductForm({
  onCancel,
  onSaved,
  product,
}: {
  product?: ProductDetails;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const cache = useQueryClient();
  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
  });
  const [category, setCategory] = useState(product?.categoryId ?? "");
  const [images, setImages] = useState<ProductImage[]>(product?.media ?? []);
  const [variants, setVariants] = useState<VariantDraft[]>(() => variantDrafts(product));
  const [mainDimensions, setMainDimensions] = useState(
    () => product?.dimensions ?? variants[0]?.dimensions ?? "",
  );
  const [uploading, setUploading] = useState(false);
  // Warn before leaving with unsaved edits; a successful save navigates away freely.
  const [dirty, setDirty] = useState(false);
  const saved = useRef(false);
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && !saved.current && currentLocation.pathname !== nextLocation.pathname,
  );
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const updateImages = (next: SetStateAction<ProductImage[]>) => {
    setDirty(true);
    setImages(next);
  };
  const updateVariants = (next: SetStateAction<VariantDraft[]>) => {
    setDirty(true);
    setVariants(next);
  };
  const mutation = useMutation({
    mutationFn: (body: unknown) =>
      product ? updateProduct(product.id, body) : createProduct(body),
    onSuccess: () => {
      void cache.invalidateQueries({ queryKey: ["products"] });
      if (product)
        void cache.invalidateQueries({ queryKey: ["product", product.id] });
      void cache.invalidateQueries({ queryKey: ["categories"] });
      void cache.invalidateQueries({ queryKey: ["dashboard"] });
      saved.current = true;
      onSaved();
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mutation.isPending || uploading || variants.length === 0) return;
    mutation.mutate(
      productPayload({ form: new FormData(event.currentTarget), category, images, variants, mainDimensions }),
    );
  }

  return (
    <div className="mx-auto max-w-5xl py-6">
      <Button
        variant="outline"
        onClick={onCancel}
        disabled={mutation.isPending || uploading}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Nazad na proizvode
      </Button>
      <div className="mb-8 mt-6">
        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
          Katalog
        </p>
        <h1 id="page-title" tabIndex={-1} className="mt-2 font-serif text-4xl outline-none">
          {product ? "Uredi proizvod" : "Dodaj proizvod"}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Opišite proizvod, odaberite kategoriju i postavite cijenu. Polja
          označena zvjezdicom (*) su obavezna.
        </p>
      </div>
      {blocker.state === "blocked" && (
        <div role="alertdialog" aria-label="Nesačuvane izmjene" className="mt-6 flex flex-wrap items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm">
          <p className="flex-1">Imate nesačuvane izmjene. Napustiti stranicu bez čuvanja?</p>
          <Button type="button" variant="outline" onClick={() => blocker.reset()}>Ostani</Button>
          <Button type="button" onClick={() => blocker.proceed()}>Napusti bez čuvanja</Button>
        </div>
      )}
      <form onSubmit={submit} onChange={() => setDirty(true)} className="space-y-6">
        <ProductImages
          images={images}
          onChange={updateImages}
          onBusy={setUploading}
          disabled={mutation.isPending}
        />
        <fieldset
          disabled={mutation.isPending || uploading}
          className="grid min-w-0 gap-6 lg:grid-cols-[1fr_300px]"
        >
          <div className="space-y-6">
            <Card className="space-y-5 p-6">
              <h3 className="font-serif text-2xl">Detalji proizvoda</h3>
              <Field label="Naziv proizvoda na bosanskom *">
                <Input
                  name="name.bs"
                  defaultValue={product?.translations.bs?.name ?? ""}
                  required
                  maxLength={200}
                  placeholder="npr. Monogram za vjenčanje"
                />
              </Field>
              <Field label="Kratki slogan">
                <Input
                  name="tagline.bs"
                  defaultValue={product?.translations.bs?.tagline ?? ""}
                  maxLength={300}
                  placeholder="Kratka rečenica koja opisuje proizvod"
                />
              </Field>
              <Field label="Kratki opis">
                <textarea
                  name="shortDescription.bs"
                  defaultValue={
                    product?.translations.bs?.shortDescription ?? ""
                  }
                  className={control}
                  rows={2}
                  maxLength={1000}
                />
              </Field>
              <Field label="Opis na bosanskom *">
                <textarea
                  name="description.bs"
                  defaultValue={product?.translations.bs?.description ?? ""}
                  className={control}
                  rows={5}
                  required
                  maxLength={10000}
                />
              </Field>
              <Field
                label="Glavne dimenzije *"
                hint="Prikazuju se kao osnovne dimenzije proizvoda i koriste se za prvu varijantu."
              >
                <Input
                  required
                  maxLength={200}
                  placeholder="npr. 30 × 30 cm"
                  value={mainDimensions}
                  onChange={(event) => setMainDimensions(event.target.value)}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Rok izrade na bosanskom *">
                  <Input
                    name="leadTime.bs"
                    defaultValue={product?.leadTime.bs ?? ""}
                    required
                    maxLength={200}
                    placeholder="3 do 5 radnih dana"
                  />
                </Field>
                <Field label="Dostupnost na bosanskom *">
                  <Input
                    name="stockLabel.bs"
                    required
                    maxLength={200}
                    defaultValue={product?.stockLabel.bs ?? "Po narudžbi"}
                  />
                </Field>
              </div>
            </Card>
            <VariantEditor
              variants={variants}
              onChange={updateVariants}
              mainDimensions={mainDimensions}
            />
            <Card className="p-6">
              <details>
                <summary className="cursor-pointer font-serif text-2xl">
                  Sadržaj na engleskom{" "}
                  <span className="ml-2 font-sans text-xs text-muted-foreground">
                    Opcionalno
                  </span>
                </summary>
                <p className="my-4 text-sm text-muted-foreground">
                  Ostavite polje prazno kako bi se koristio tekst na bosanskom.
                </p>
                <div className="space-y-4">
                  <Field label="Naziv proizvoda na engleskom">
                    <Input
                      name="name.en"
                      defaultValue={product?.translations.en?.name ?? ""}
                      maxLength={200}
                    />
                  </Field>
                  <Field label="Kratki slogan na engleskom">
                    <Input
                      name="tagline.en"
                      defaultValue={product?.translations.en?.tagline ?? ""}
                      maxLength={300}
                    />
                  </Field>
                  <Field label="Kratki opis na engleskom">
                    <textarea
                      name="shortDescription.en"
                      defaultValue={
                        product?.translations.en?.shortDescription ?? ""
                      }
                      className={control}
                      rows={2}
                      maxLength={1000}
                    />
                  </Field>
                  <Field label="Opis na engleskom">
                    <textarea
                      name="description.en"
                      defaultValue={product?.translations.en?.description ?? ""}
                      className={control}
                      rows={4}
                      maxLength={10000}
                    />
                  </Field>
                  <Field label="Rok izrade na engleskom">
                    <Input
                      name="leadTime.en"
                      defaultValue={product?.leadTime.en ?? ""}
                      maxLength={200}
                    />
                  </Field>
                  <Field label="Dostupnost na engleskom">
                    <Input
                      name="stockLabel.en"
                      defaultValue={product?.stockLabel.en ?? ""}
                      maxLength={200}
                    />
                  </Field>
                </div>
              </details>
            </Card>
          </div>
          <div className="space-y-6">
            <Card className="space-y-5 p-6">
              <h3 className="font-serif text-2xl">Organizacija</h3>
              <Field label="Kategorija *">
                <select
                  className={control}
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  required
                >
                  <option value="">
                    {categories.isPending
                      ? "Učitavanje kategorija…"
                      : "Odaberite kategoriju"}
                  </option>
                  {/* Keep a saved category selectable while the list is loading or failed. */}
                  {category &&
                    category !== "new" &&
                    !categories.data?.some((item) => item.id === category) && (
                      <option value={category}>Trenutna kategorija</option>
                    )}
                  {categories.data?.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.translations.bs?.name ??
                        item.translations.en?.name ??
                        item.id}
                    </option>
                  ))}
                  <option value="new">+ Kreiraj kategoriju</option>
                </select>
              </Field>
              {categories.isError && (
                <div role="alert" className="space-y-2 text-sm">
                  <p>Kategorije nije moguće učitati.</p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void categories.refetch()}
                  >
                    Pokušaj ponovo
                  </Button>
                </div>
              )}
              {categories.data?.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Još nema kategorija. Odaberite „Kreiraj kategoriju“ kako biste
                  dodali prvu.
                </p>
              )}
              {category === "new" && (
                <div className="space-y-4 border-l-2 border-primary/30 pl-4">
                  <Field label="Naziv kategorije na bosanskom *">
                    <Input name="category.bs" required maxLength={200} />
                  </Field>
                  <Field label="Naziv kategorije na engleskom">
                    <Input name="category.en" maxLength={200} />
                  </Field>
                </div>
              )}
              <Field label="Tip proizvoda *">
                <select
                  name="type"
                  className={control}
                  defaultValue={product?.type ?? "standard"}
                >
                  <option value="standard">Standardni</option>
                  <option value="custom">Personalizirani</option>
                </select>
              </Field>
              <Field label="Materijal *">
                <select
                  name="material"
                  className={control}
                  defaultValue={product?.material ?? "wood"}
                >
                  <option value="wood">Drvo</option>
                  <option value="resin">Epoksidna smola</option>
                  <option value="mixed">Kombinovani materijali</option>
                </select>
              </Field>
            </Card>
            <Card className="space-y-4 p-6">
              <h3 className="font-serif text-2xl">Opcije</h3>
              <label className="flex items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  name="featured"
                  defaultChecked={product?.featured ?? false}
                  className="h-4 w-4 accent-primary"
                />
                Istaknuti proizvod
              </label>
              <label className="flex items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  name="customizable"
                  defaultChecked={product?.customizable ?? false}
                  className="h-4 w-4 accent-primary"
                />
                Dozvoli personalizaciju
              </label>
            </Card>
          </div>
        </fieldset>
        {mutation.isError && (
          <p
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
          >
            {mutation.error.message}
          </p>
        )}
        <div className="flex items-center justify-end gap-3 border-t pt-5">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={mutation.isPending || uploading}
          >
            Odustani
          </Button>
          <Button type="submit" disabled={mutation.isPending || uploading}>
            <PackagePlus className="mr-2 h-4 w-4" />
            {mutation.isPending
              ? "Čuvanje proizvoda…"
              : product
                ? "Sačuvaj izmjene"
                : "Sačuvaj proizvod"}
          </Button>
        </div>
      </form>
    </div>
  );
}
