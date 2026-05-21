"use client";

import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LocationForm } from "./location-form";
import { useCreateLocation } from "@/hooks/use-locations";
import type { LocationCreate } from "@/types/location";

interface LocationCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string;
  businessSlug?: string;
}

export function LocationCreateDialog({
  open,
  onOpenChange,
  businessId,
  businessSlug,
}: LocationCreateDialogProps) {
  const t = useTranslations("loyaltyProgram.locations.create");
  const create = useCreateLocation(businessId);

  const handleSubmit = async (body: LocationCreate) => {
    await create.mutateAsync(body);
    toast.success(t("successToast"));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <LocationForm
          businessId={businessId}
          businessSlug={businessSlug}
          mode="create"
          canEditNonPrimary
          onSubmit={(body) => handleSubmit(body as LocationCreate)}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
