<script setup lang="ts">
import { watch, onBeforeUnmount } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import { TextStyle } from '@tiptap/extension-text-style'
import { Extension } from '@tiptap/core'

// Custom FontSize extension (avoids Tiptap Pro)
const FontSize = Extension.create({
  name: 'fontSize',
  addGlobalAttributes() {
    return [{
      types: ['textStyle'],
      attributes: {
        fontSize: {
          default: null,
          parseHTML: (el: HTMLElement) => el.style.fontSize?.replace('px', '') || null,
          renderHTML: (attrs: Record<string, unknown>) => attrs['fontSize']
            ? { style: `font-size: ${attrs['fontSize']}px` }
            : {},
        },
      },
    }]
  },
})

const props = defineProps<{ modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [html: string] }>()

const FONT_SIZES = ['12', '14', '16', '18', '24', '32']

const editor = useEditor({
  extensions: [StarterKit, TextStyle, FontSize],
  content: props.modelValue,
  onUpdate: ({ editor }) => emit('update:modelValue', editor.getHTML()),
})

watch(() => props.modelValue, (val) => {
  if (editor.value && editor.value.getHTML() !== val) {
    editor.value.commands.setContent(val)
  }
})

onBeforeUnmount(() => editor.value?.destroy())

function setFontSize(size: string) {
  editor.value?.chain().focus().setMark('textStyle', { fontSize: size }).run()
}
</script>

<template>
  <div class="tiptap-wrapper border rounded-lg overflow-hidden bg-white shadow-lg" @click.stop>
    <!-- Toolbar -->
    <div class="flex items-center gap-1 px-2 py-1 border-b bg-gray-50 flex-wrap">
      <button
        @click="editor?.chain().focus().toggleBold().run()"
        :class="['w-7 h-7 rounded text-sm font-bold flex items-center justify-center', editor?.isActive('bold') ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-200 text-gray-600']"
        title="Gras"
      >B</button>

      <button
        @click="editor?.chain().focus().toggleItalic().run()"
        :class="['w-7 h-7 rounded text-sm italic flex items-center justify-center', editor?.isActive('italic') ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-200 text-gray-600']"
        title="Italique"
      >I</button>

      <div class="w-px h-5 bg-gray-300 mx-1" />

      <select
        @change="setFontSize(($event.target as HTMLSelectElement).value)"
        class="text-xs border rounded px-1 py-0.5 focus:outline-none"
        title="Taille de police"
      >
        <option value="">Taille</option>
        <option v-for="s in FONT_SIZES" :key="s" :value="s">{{ s }}px</option>
      </select>

      <div class="w-px h-5 bg-gray-300 mx-1" />

      <button
        @click="editor?.chain().focus().toggleBulletList().run()"
        :class="['w-7 h-7 rounded flex items-center justify-center', editor?.isActive('bulletList') ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-200 text-gray-600']"
        title="Liste"
      >
        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
      </button>
    </div>

    <!-- Editor area -->
    <EditorContent
      :editor="editor"
      class="prose prose-sm max-w-none p-3 min-h-16 max-h-48 overflow-y-auto focus:outline-none"
    />
  </div>
</template>

<style>
</style>
