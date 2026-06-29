import { AuthScreen } from "@/components/AuthForm";

export default async function JoinPage({ searchParams }: { searchParams: Promise<{ expired?: string }> }) {
  const { expired } = await searchParams;
  return <AuthScreen expired={expired === "1"} />;
}
