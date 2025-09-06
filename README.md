# EO/SAR Split-View Map with AOI Clip & Align

This project is a full-stack web application that allows users to upload two GeoTIFF images, draw an Area of Interest (AOI), and process the images to clip them to the AOI and align them.

## Setup

To run the application, you need to have Docker and Docker Compose installed.

1.  Clone the repository.
2.  Open a terminal in the root of the project.
3.  Run the following command:

```bash
docker compose up --build
```

This will build the Docker images for the web, api, and worker services and start the application.

The web application will be available at `http://localhost:5173`.

## API Endpoints

### `POST /api/upload`

Uploads a GeoTIFF image.

-   **Request:** `multipart/form-data` with a single file field named `file`.
-   **Response:**

```json
{
  "imageId": "<imageId>"
}
```

### `POST /api/jobs`

Creates a new processing job.

-   **Request Body:**

```json
{
  "imageAId": "<imageAId>",
  "imageBId": "<imageBId>",
  "aoi": {
    "north": <latN>,
    "south": <latS>,
    "east": <lonE>,
    "west": <lonW>
  }
}
```

-   **Response:**

```json
{
  "jobId": "<jobId>"
}
```

### `GET /api/jobs/:jobId`

Gets the status of a processing job.

-   **Response:**

```json
{
  "status": "<Pending | Running | Error | Done>",
  "progress": <number>,
  "error": "<error message>",
  "outputs": {
    "imageAUrl": "/rasters/outputs/<jobId>/A_clipped.tif",
    "imageBUrl": "/rasters/outputs/<jobId>/B_clipped_aligned.tif"
  }
}
```

## Alignment Method

The alignment of Image B to Image A is performed using the phase cross-correlation method provided by the `scikit-image` library. This method is a translational alignment technique that is efficient and deterministic.

Phase cross-correlation works by computing the Fourier transform of both images, calculating the cross-power spectrum, and then finding the peak in the inverse Fourier transform of the normalized cross-power spectrum. The location of this peak corresponds to the translational shift between the two images. This shift is then used to align Image B with Image A.

## Known Limitations & Tradeoffs

-   **Alignment Method:** The chosen alignment method, phase cross-correlation, only accounts for translational differences between the images. It does not handle rotational or scaling differences. For more complex alignment scenarios, a feature-based method like ORB/SIFT + RANSAC would be more suitable.
-   **Large Files:** The application is designed to handle GeoTIFFs up to 150 MB. For larger files, the browser preview might become slow or unresponsive. A more robust solution would involve pre-rendering PNG tiles on the server-side.
-   **Error Handling:** The error handling in the worker is basic. A more comprehensive solution would involve more specific error messages and a more robust way of reporting the progress and status of the job.
