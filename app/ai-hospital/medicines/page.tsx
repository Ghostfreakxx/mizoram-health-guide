import type { Metadata } from "next";
import { AI_HOSPITAL } from "../../config";
import PageHeader from "../../components/PageHeader";
import MedicineGuide from "./MedicineGuide";

export const metadata: Metadata = {
  title: `Medicine Information — ${AI_HOSPITAL.name}`,
  description: "Understand your prescription and common medicines. General information only — no doses.",
};

export default function MedicinesPage() {
  return (
    <main className="flex-1">
      <PageHeader
        title="Medicine information"
        icon="💊"
        intro="Understand what is written on your prescription, what common medicines are generally used for, and how to use medicines safely."
        crumbs={[{ href: "/ai-hospital", label: AI_HOSPITAL.name }]}
      />
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <MedicineGuide />
      </div>
    </main>
  );
}
