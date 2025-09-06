import 'leaflet';

declare module 'leaflet' {
  interface Map {
    sync(map: Map, options?: any): this;
  }
}
