import { useState } from "react";
import axios from "axios";
import { toast } from "sonner";

export type ContactPayload = {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
};

export function useContactSubmit() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (payload: ContactPayload): Promise<boolean> => {
    setIsSubmitting(true);
    try {
      const res = await axios.post(import.meta.env.VITE_CONTACT_URL, payload);
      toast.success(res.data?.message ?? "Message sent");
      return true;
    } catch {
      toast.error("Failed to send message. Please try again.");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return { submit, isSubmitting };
}
