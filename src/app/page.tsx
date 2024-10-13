import TokenScanner from "@/components/TokenScanner";
import Image from "next/image";

export default function Home() {
  return (
    <div className="flex h-screen w-full justify-center items-center">
      <TokenScanner />
    </div>
  );
}
