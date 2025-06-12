import { EditPermitModalUnified } from "./edit-permit-modal-unified";
import type { Permit } from "@shared/schema";

interface EditPermitModalProps {
  permit: Permit | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditPermitModal({ permit, open, onOpenChange }: EditPermitModalProps) {
  return (
    <EditPermitModalUnified
      permit={permit}
      open={open}
      onOpenChange={onOpenChange}
    />
  );
}