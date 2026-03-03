<script setup lang="ts">
import { onMounted } from 'vue'
import { usePlansStore } from '@/stores/plansStore'
import { usePeopleStore } from '@/stores/peopleStore'
import PlanView from '@/views/PlanView.vue'

const plansStore = usePlansStore()
const peopleStore = usePeopleStore()

onMounted(async () => {
  await Promise.all([plansStore.loadPlans(), peopleStore.loadPeople()])
})
</script>

<template>
  <PlanView />
</template>
