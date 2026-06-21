export const MAX_PHOTO_FILE_SIZE_BYTES = 5 * 1024 * 1024
export const MAX_PHOTO_FILE_SIZE_LABEL = '5MB'

export const isPhotoFileWithinSizeLimit = (file: File): boolean =>
  file.size <= MAX_PHOTO_FILE_SIZE_BYTES

export const getPhotoFileSizeLimitError = (fileName?: string): string =>
  fileName
    ? `${fileName} exceeds the maximum photo size of ${MAX_PHOTO_FILE_SIZE_LABEL}.`
    : `Photo exceeds the maximum size of ${MAX_PHOTO_FILE_SIZE_LABEL}.`

export const partitionPhotoFilesBySize = (files: File[]): { accepted: File[]; rejected: File[] } => {
  const accepted: File[] = []
  const rejected: File[] = []

  for (const file of files) {
    if (isPhotoFileWithinSizeLimit(file)) accepted.push(file)
    else rejected.push(file)
  }

  return { accepted, rejected }
}

export const getPhotoFilesSizeValidationMessage = (rejected: File[]): string | null => {
  if (rejected.length === 0) return null
  if (rejected.length === 1) return getPhotoFileSizeLimitError(rejected[0].name)
  return `${rejected.length} photo(s) exceed the maximum size of ${MAX_PHOTO_FILE_SIZE_LABEL}.`
}

export const validatePhotoFileSelection = (
  file: File | null | undefined,
): { file: File | null; error: string | null } => {
  if (!file) return { file: null, error: null }
  if (isPhotoFileWithinSizeLimit(file)) return { file, error: null }
  return { file: null, error: getPhotoFileSizeLimitError(file.name) }
}

export const validatePhotoFilesSelection = (
  files: File[],
): { files: File[]; error: string | null } => {
  const { accepted, rejected } = partitionPhotoFilesBySize(files)
  return {
    files: accepted,
    error: getPhotoFilesSizeValidationMessage(rejected),
  }
}
