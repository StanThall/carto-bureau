<script setup lang="ts">
import { ref } from 'vue'
import { usePeopleStore } from '@/stores/peopleStore'

const peopleStore = usePeopleStore()
const isDragging = ref(false)
const loading = ref(false)
const message = ref<{ text: string; type: 'success' | 'error' } | null>(null)

async function handleFile(file: File) {
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (!['csv', 'xlsx', 'xls'].includes(ext ?? '')) {
    message.value = { text: 'Format non supporté. Utilisez CSV ou XLSX.', type: 'error' }
    return
  }
  loading.value = true
  message.value = null
  try {
    const { added, deleted } = await peopleStore.importFromFile(file)
    const parts = []
    if (added > 0) parts.push(`${added} ajoutée(s)`)
    if (deleted > 0) parts.push(`${deleted} supprimée(s)`)
    message.value = { text: parts.length ? parts.join(', ') : 'Aucun changement', type: 'success' }
  } catch {
    message.value = { text: 'Erreur lors de l\'import', type: 'error' }
  } finally {
    loading.value = false
  }
}

function onFileInput(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) handleFile(file)
  ;(e.target as HTMLInputElement).value = ''
}

function onDrop(e: DragEvent) {
  isDragging.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file) handleFile(file)
}

async function clearPeople() {
  if (!confirm('Supprimer toutes les personnes importées ?')) return
  await peopleStore.clearAll()
  message.value = { text: 'Liste vidée', type: 'success' }
}
</script>

<template>
  <div class="p-3 border-b space-y-2">
    <label
      class="flex items-center justify-center gap-2 w-full py-2 border-2 border-dashed rounded-lg cursor-pointer text-sm transition-colors"
      :class="isDragging ? 'border-blue-400 bg-blue-50 text-blue-600' : 'border-gray-300 text-gray-500 hover:border-blue-400 hover:text-blue-500'"
      @dragover.prevent="isDragging = true"
      @dragleave="isDragging = false"
      @drop.prevent="onDrop"
    >
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
      </svg>
      {{ loading ? 'Chargement...' : 'Importer CSV / XLSX' }}
      <input type="file" accept=".csv,.xlsx,.xls" class="hidden" @change="onFileInput" :disabled="loading" />
    </label>

    <p v-if="message" :class="['text-xs px-2 py-1 rounded', message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700']">
      {{ message.text }}
    </p>

    <button
      v-if="peopleStore.people.length > 0"
      @click="clearPeople"
      class="text-xs text-red-400 hover:text-red-600 w-full text-center"
    >
      Vider la liste ({{ peopleStore.people.length }} personnes)
    </button>
  </div>
</template>
