"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/backend-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type PatientFormData = {
  patient_id?: string;
  name: string;
  age: number | string;
  gender: string;
  diagnosis: string;
  allergies: string;
  status: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (patient: unknown) => void;
  editPatient?: PatientFormData | null;
};

export function PatientFormDialog({ open, onOpenChange, onSuccess, editPatient }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<PatientFormData>({
    name: "",
    age: "",
    gender: "",
    diagnosis: "",
    allergies: "",
    status: "stable",
  });

  useEffect(() => {
    if (open) {
      if (editPatient) {
        setForm({
          ...editPatient,
          age: editPatient.age ?? "",
          diagnosis: Array.isArray(editPatient.diagnosis)
            ? (editPatient as unknown as { diagnosis: string[] }).diagnosis.join(", ")
            : editPatient.diagnosis,
          allergies: Array.isArray(editPatient.allergies)
            ? (editPatient as unknown as { allergies: string[] }).allergies.join(", ")
            : editPatient.allergies,
        });
      } else {
        setForm({ name: "", age: "", gender: "", diagnosis: "", allergies: "", status: "stable" });
      }
      setError("");
    }
  }, [open, editPatient]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const payload = {
      name: form.name.trim(),
      age: Number(form.age),
      gender: form.gender,
      diagnosis: form.diagnosis
        .split(",")
        .map((d) => d.trim())
        .filter(Boolean),
      allergies: form.allergies
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean),
      status: form.status,
    };

    try {
      let result: unknown;
      if (editPatient?.patient_id) {
        result = await fetchApi(`/api/patient/${editPatient.patient_id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        result = await fetchApi("/api/patients", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      onSuccess(result);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save patient");
    } finally {
      setLoading(false);
    }
  };

  const isEditing = !!editPatient?.patient_id;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            {isEditing ? "Edit Patient" : "Add New Patient"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Full Name
            </label>
            <Input
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Rahul Sharma"
              className="rounded-lg"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Age
              </label>
              <Input
                required
                type="number"
                min={0}
                max={120}
                value={form.age}
                onChange={(e) => setForm((f) => ({ ...f, age: e.target.value }))}
                placeholder="e.g. 45"
                className="rounded-lg"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Gender
              </label>
              <Select
                value={form.gender}
                onValueChange={(v) => setForm((f) => ({ ...f, gender: v }))}
                required
              >
                <SelectTrigger className="rounded-lg">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Status
            </label>
            <Select
              value={form.status}
              onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}
            >
              <SelectTrigger className="rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="stable">Stable</SelectItem>
                <SelectItem value="monitoring">Monitoring</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Diagnoses{" "}
              <span className="normal-case font-normal text-muted-foreground">
                (comma-separated)
              </span>
            </label>
            <Input
              value={form.diagnosis}
              onChange={(e) => setForm((f) => ({ ...f, diagnosis: e.target.value }))}
              placeholder="e.g. Type 2 Diabetes, Hypertension"
              className="rounded-lg"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Allergies{" "}
              <span className="normal-case font-normal text-muted-foreground">
                (comma-separated)
              </span>
            </label>
            <Input
              value={form.allergies}
              onChange={(e) => setForm((f) => ({ ...f, allergies: e.target.value }))}
              placeholder="e.g. Penicillin, Sulfa drugs"
              className="rounded-lg"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-lg"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="rounded-lg">
              {loading ? "Saving..." : isEditing ? "Update Patient" : "Add Patient"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
