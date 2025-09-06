import argparse
import os
import rasterio
from rasterio.mask import mask
from rasterio.warp import reproject, Resampling
import numpy as np
from skimage.registration import phase_cross_correlation
from shapely.geometry import box

def clip_raster(raster_path, output_path, aoi_bounds):
    """Clips a raster to the given AOI."""
    with rasterio.open(raster_path) as src:
        aoi_geom = box(aoi_bounds['west'], aoi_bounds['south'], aoi_bounds['east'], aoi_bounds['north'])
        out_image, out_transform = mask(src, [aoi_geom], crop=True)
        out_meta = src.meta.copy()

        out_meta.update({
            "driver": "GTiff",
            "height": out_image.shape[1],
            "width": out_image.shape[2],
            "transform": out_transform
        })

        with rasterio.open(output_path, "w", **out_meta) as dest:
            dest.write(out_image)

def align_image_b_to_a(image_a_path, image_b_path, output_path):
    """Aligns image B to image A using phase cross-correlation."""
    with rasterio.open(image_a_path) as src_a, rasterio.open(image_b_path) as src_b:
        # Ensure both images have the same dimensions for correlation
        # This is a simplification; a more robust solution would handle different resolutions
        if src_a.shape != src_b.shape:
            # Resample B to match A's dimensions
            b_resampled = np.empty((src_a.count, src_a.height, src_a.width), dtype=src_b.dtypes[0])
            reproject(
                source=rasterio.band(src_b, range(1, src_b.count + 1)),
                destination=b_resampled,
                src_transform=src_b.transform,
                src_crs=src_b.crs,
                dst_transform=src_a.transform,
                dst_crs=src_a.crs,
                resampling=Resampling.bilinear
            )
            image_b_data = b_resampled[0] # Use the first band for correlation
        else:
            image_b_data = src_b.read(1)

        image_a_data = src_a.read(1)

        # Phase cross-correlation to find the shift
        shift, _, _ = phase_cross_correlation(image_a_data, image_b_data)
        dy, dx = shift

        # Create a new transform for the aligned image B
        aligned_transform = src_b.transform * src_b.transform.translation(dx, dy)

        # Write the aligned image B
        out_meta = src_b.meta.copy()
        out_meta.update({
            'transform': aligned_transform
        })

        with rasterio.open(output_path, 'w', **out_meta) as dest:
            for i in range(1, src_b.count + 1):
                reproject(
                    source=rasterio.band(src_b, i),
                    destination=rasterio.band(dest, i),
                    src_transform=src_b.transform,
                    src_crs=src_b.crs,
                    dst_transform=aligned_transform,
                    dst_crs=src_a.crs,
                    resampling=Resampling.bilinear
                )

def parse_aoi(aoi_str):
    """Parses the AOI string into a dictionary."""
    parts = aoi_str.split(';')
    aoi = {}
    for part in parts:
        key, value = part.split('=')
        aoi[key] = float(value)
    return aoi

def main():
    parser = argparse.ArgumentParser(description='Clip and align GeoTIFF images.')
    parser.add_argument('--image_a', required=True, help='Path to image A.')
    parser.add_argument('--image_b', required=True, help='Path to image B.')
    parser.add_argument('--aoi', required=True, help='Area of Interest in format "north=<latN>;south=<latS>;east=<lonE>;west=<lonW>".')
    parser.add_argument('--out_dir', required=True, help='Output directory for processed files.')

    args = parser.parse_args()

    os.makedirs(args.out_dir, exist_ok=True)

    aoi_bounds = parse_aoi(args.aoi)

    # Clip image A
    clipped_a_path = os.path.join(args.out_dir, 'A_clipped.tif')
    clip_raster(args.image_a, clipped_a_path, aoi_bounds)

    # Clip image B
    clipped_b_path = os.path.join(args.out_dir, 'B_clipped.tif')
    clip_raster(args.image_b, clipped_b_path, aoi_bounds)

    # Align clipped image B to clipped image A
    aligned_b_path = os.path.join(args.out_dir, 'B_clipped_aligned.tif')
    align_image_b_to_a(clipped_a_path, clipped_b_path, aligned_b_path)

    print(f'Processing complete. Files saved in {args.out_dir}')

if __name__ == '__main__':
    main()