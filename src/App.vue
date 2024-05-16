<template>
  <div id="app">
    <BigComponent/>
  </div>
</template>

<script>
import BigComponent from './components/BigComponent.vue';

export default {
  name: 'App',
  components: {
    BigComponent
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
