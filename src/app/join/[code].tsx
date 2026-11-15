import { useLocalSearchParams } from "expo-router";
import { Join } from "@/screens/join";

export default function JoinRoute() {
  const { code } = useLocalSearchParams<{ code: string }>();
  return <Join code={String(code ?? "").toUpperCase()} />;
}
