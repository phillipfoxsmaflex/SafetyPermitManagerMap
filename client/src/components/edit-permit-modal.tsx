import { EditPermitModalEnhanced } from "./edit-permit-modal-enhanced";
import type { Permit } from "@shared/schema";

interface EditPermitModalProps {
  permit: Permit | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditPermitModal({ permit, open, onOpenChange }: EditPermitModalProps) {
  return (
    <EditPermitModalEnhanced
      permit={permit}
      open={open}
      onOpenChange={onOpenChange}
    />
  );
}