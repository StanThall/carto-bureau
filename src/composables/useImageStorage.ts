import { ref, onUnmounted } from 'vue'
import { db } from '@/db'

export function useImageStorage() {
  const objectUrl = ref<string | null>(null)

  async function loadImage(imageId: string) {
    const record = await db.images.get(imageId)
    if (!record) return
    if (objectUrl.value) URL.revokeObjectURL(objectUrl.value)
    objectUrl.value = URL.createObjectURL(record.blob)
  }

  function revoke() {
    if (objectUrl.value) {
      URL.revokeObjectURL(objectUrl.value)
      objectUrl.value = null
    }
  }

  onUnmounted(revoke)

  return { objectUrl, loadImage, revoke }
}
