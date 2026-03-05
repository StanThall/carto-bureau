import { ref } from 'vue'

export function useImageStorage() {
  const objectUrl = ref<string | null>(null)

  function loadImage(imageId: string) {
    objectUrl.value = `/api/images/${imageId}`
  }

  return { objectUrl, loadImage }
}
