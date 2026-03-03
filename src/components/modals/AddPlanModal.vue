<script setup lang="ts">
import { ref } from 'vue'
import { usePlansStore } from '@/stores/plansStore'

const emit = defineEmits<{ close: [] }>()

const plansStore = usePlansStore()

const planName = ref('')
const imageFile = ref<File | null>(null)
const imagePreview = ref<string | null>(null)
const loading = ref(false)

function onFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  imageFile.value = file
  imagePreview.value = URL.createObjectURL(file)
}

async function create() {
  if (!planName.value.trim() || !imageFile.value) return
  loading.value = true
  await plansStore.addPlan(planName.value.trim(), imageFile.value)
  loading.value = false
  emit('close')
}

function close() {
  if (imagePreview.value) URL.revokeObjectURL(imagePreview.value)
  emit('close')
}
</script>

<template>
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" @click.self="close">
    <div class="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
      <div class="px-6 py-4 border-b flex items-center justify-between">
        <h2 class="text-lg font-semibold text-gray-800">Nouveau plan</h2>
        <button @click="close" class="text-gray-400 hover:text-gray-600">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div class="p-6 space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Nom du plan</label>
          <input
            v-model="planName"
            type="text"
            placeholder="Ex: Étage 2 — Bâtiment A"
            class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            @keyup.enter="create"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Image du plan</label>
          <label class="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
            <div v-if="!imagePreview" class="text-center">
              <svg class="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span class="text-sm text-gray-500">Cliquer pour choisir une image</span>
            </div>
            <img v-else :src="imagePreview" class="h-full object-contain rounded" alt="image placeholder"/>
            <input type="file" accept="image/*" class="hidden" @change="onFileChange" />
          </label>
        </div>
      </div>

      <div class="px-6 py-4 border-t flex justify-end gap-3">
        <button @click="close" class="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Annuler</button>
        <button
          @click="create"
          :disabled="!planName.trim() || !imageFile || loading"
          class="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ loading ? 'Création...' : 'Créer le plan' }}
        </button>
      </div>
    </div>
  </div>
</template>
