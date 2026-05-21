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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { LocationForm } from "./location-form";
import {
  useCreateLocation,
  useUpdateLocation,
} from "@/hooks/use-locations";
import type {
  Location,
  LocationCreate,
  LocationPatch,
} from "@/types/location";

type LocationDialogProps =
  | {
      open: boolean;
      onOpenChange: (open: boolean) => void;
      businessId: string;
      businessSlug?: string;
      mode: "create";
    }
  | {
      open: boolean;
      onOpenChange: (open: boolean) => void;
      businessId: string;
      businessSlug?: string;
      mode: "edit";
      location: Location;
      canManageNonPrimary: boolean;
    };

export function LocationDialog(props: LocationDialogProps) {
  const { open, onOpenChange, businessId, businessSlug, mode } = props;
  const isMobile = useIsMobile();
  const tCreate = useTranslations("loyaltyProgram.locations.create");
  const tEdit = useTranslations("loyaltyProgram.locations.edit");
  const tDetail = useTranslations("loyaltyProgram.locations.detail");

  const create = useCreateLocation(businessId);
  const update = useUpdateLocation(businessId);

  const title = mode === "create" ? tCreate("title") : tEdit("title");
  const description =
    mode === "create" ? tCreate("description") : tEdit("description");

  const handleSubmit = async (body: LocationCreate | LocationPatch) => {
    if (mode === "create") {
      await create.mutateAsync(body as LocationCreate);
      toast.success(tCreate("successToast"));
    } else {
      await update.mutateAsync({ locationId: props.location.id, body });
      toast.success(tDetail("savedToast"));
    }
    onOpenChange(false);
  };

  const form = (
    <LocationForm
      businessId={businessId}
      businessSlug={businessSlug}
      mode={mode}
      initial={mode === "edit" ? props.location : undefined}
      canEditNonPrimary={mode === "edit" ? props.canManageNonPrimary : true}
      onSubmit={handleSubmit}
      onCancel={() => onOpenChange(false)}
    />
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="flex flex-col gap-0 p-0 max-h-[90vh] rounded-t-2xl overflow-hidden border-t-0"
        >
          {/* drag handle */}
          <div className="flex justify-center pt-2.5 pb-1 shrink-0">
            <div className="h-1 w-10 rounded-full bg-[var(--border-dark)] opacity-60" />
          </div>
          <div className="px-5 pb-4 pr-12 border-b border-[var(--border)] shrink-0">
            <SheetTitle className="text-[18px] font-bold text-[#1A1A1A] text-left">
              {title}
            </SheetTitle>
            <SheetDescription className="text-sm text-[var(--muted-foreground)] mt-1 text-left">
              {description}
            </SheetDescription>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-5">{form}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {form}
      </DialogContent>
    </Dialog>
  );
}
