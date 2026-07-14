declare module "@mapbox/shp-write" {
  interface ShpWriteOptions {
    folder?: string;
    filename?: string;
    outputType?: "blob" | "arraybuffer" | "uint8array";
    compression?: "STORE" | "DEFLATE";
    types?: {
      point?: string;
      polygon?: string;
      polyline?: string;
      line?: string;
    };
    prj?: string;
  }

  export function zip(geojson: GeoJSON.FeatureCollection, options?: ShpWriteOptions): string;
}
