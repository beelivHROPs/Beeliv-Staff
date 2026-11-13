import type { Metadata } from "next";
import { HomeBody } from "@/components/staff/home/HomeBody";

export const metadata: Metadata = { title: "Home" };

export default function StaffHomePage() {
  return <HomeBody />;
}
