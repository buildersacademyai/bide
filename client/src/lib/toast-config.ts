import { ToastProps } from "@/components/ui/toast"

export const defaultToastConfig: Partial<ToastProps> = {
  duration: 2000, // 2 seconds
};

// Helper function to create toast config with default duration
export function createToastConfig(props: Partial<ToastProps> = {}): Partial<ToastProps> {
  return {
    ...defaultToastConfig,
    ...props,
  };
}
