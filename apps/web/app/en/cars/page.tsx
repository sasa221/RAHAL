import type { Metadata } from "next";
import { PublicFleet } from "../../../components/public-fleet";

export const metadata: Metadata = {
  title: "Fleet | RAHAL",
  description: "Browse the fictional Rahal demo fleet and EGP-only estimates.",
};

type CarsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function EnglishCarsPage({ searchParams }: CarsPageProps) {
  const query = await searchParams;
  return (
    <PublicFleet
      locale="en"
      pickup={firstValue(query.pickup)}
      returnDate={firstValue(query.return)}
    />
  );
}
