import type { Metadata } from "next";
import { PublicFleet } from "../../components/public-fleet";

export const metadata: Metadata = {
  title: "السيارات | RAHAL رحال",
  description: "استعرض أسطول رحال وسياسات السيارات والأسعار التقديرية بالجنيه المصري.",
};

type CarsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function CarsPage({ searchParams }: CarsPageProps) {
  const query = await searchParams;
  return (
    <PublicFleet
      locale="ar"
      pickup={firstValue(query.pickup)}
      returnDate={firstValue(query.return)}
      requestedCategory={firstValue(query.category)}
      requestedDriver={firstValue(query.driver)}
    />
  );
}
