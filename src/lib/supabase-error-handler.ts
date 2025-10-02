import { toast } from "sonner";

/**
 * Handles Supabase errors with appropriate user feedback
 * @param error The error object from Supabase
 * @param customMessage Optional custom message to display instead of the default
 */
export const handleSupabaseError = (error: any, customMessage?: string) => {
  console.error("Supabase error:", error);
  
  // Network related errors
  if (error?.message?.includes("net::ERR") || error?.message?.includes("NetworkError")) {
    toast.error("Koneksi ke server gagal. Periksa koneksi internet Anda atau coba lagi nanti.");
    return;
  }
  
  // Authentication errors
  if (error?.message?.includes("Invalid login credentials")) {
    toast.error("Email atau password salah");
    return;
  }
  
  // Permission errors
  if (error?.code === "PGRST301" || error?.message?.includes("permission denied")) {
    toast.error("Anda tidak memiliki izin untuk melakukan tindakan ini");
    return;
  }
  
  // Rate limiting
  if (error?.code === "429" || error?.message?.includes("Too many requests")) {
    toast.error("Terlalu banyak permintaan. Silakan coba lagi nanti");
    return;
  }
  
  // Use custom message if provided, otherwise use a generic message
  toast.error(customMessage || "Terjadi kesalahan. Silakan coba lagi");
};

/**
 * Wraps a Supabase query with error handling
 * @param queryFn Function that performs the Supabase query
 * @param errorMessage Custom error message to display on failure
 * @returns The result of the query or null on error
 */
export const safeQueryExecute = async <T>(
  queryFn: () => Promise<{ data: T; error: any }>,
  errorMessage?: string
): Promise<T | null> => {
  try {
    const { data, error } = await queryFn();
    if (error) {
      handleSupabaseError(error, errorMessage);
      return null;
    }
    return data;
  } catch (error) {
    handleSupabaseError(error, errorMessage);
    return null;
  }
};