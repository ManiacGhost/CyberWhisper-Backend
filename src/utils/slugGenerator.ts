/**
 * Generate a URL-friendly slug from text
 */
export const generateSlug = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
};

/**
 * Generate a unique slug by appending a timestamp if needed
 */
export const generateUniqueSlug = (text: string, existingSlug?: string): string => {
  const baseSlug = generateSlug(text);
  
  // If existingSlug is provided and matches, return as is
  if (existingSlug && existingSlug === baseSlug) {
    return baseSlug;
  }
  
  // For uniqueness, append a short timestamp hash
  const timestamp = Date.now().toString(36);
  return `${baseSlug}-${timestamp}`;
};
