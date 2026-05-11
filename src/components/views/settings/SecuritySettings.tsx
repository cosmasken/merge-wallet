import ViewHeader from "@/layout/ViewHeader";

export default function SecuritySettings() {
  return (
    <div>
      <ViewHeader title="Security" subtitle="PIN, biometric, and recovery" />
      <div className="px-4 text-sm text-neutral-500">
        <p className="mb-4">Security settings will be available after wallet initialization.</p>
      </div>
    </div>
  );
}
