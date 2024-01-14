<template>
  <div id="app">
    <MapComponent/>
  </div>
</template>

<script>
import MapComponent from './components/MapComponent.vue';

export default {
  name: 'App',
  components: {
    MapComponent
  }
};
</script>

<style>
html, body, #app {
  margin: 0;
  padding: 0;
  height: 100%;
  width: 100%;
}
</style>
