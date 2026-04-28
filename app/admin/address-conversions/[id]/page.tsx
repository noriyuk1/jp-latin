import { redirect } from "next/navigation";

export default async function LegacyAddressConversionPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/output/${id}`);
}
