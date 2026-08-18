using OpenCvSharp;
using RAGnosis.Api.Services.Abstractions;

namespace RAGnosis.Api.Services;

/// <summary>
/// OpenCvSharp preprocessing pass that lifts OCR accuracy on photographed or low-contrast reports:
/// greyscale -> denoise -> adaptive threshold -> deskew.
/// Falls back to the original image if the native OpenCV binaries are unavailable on the host.
/// </summary>
public sealed class OpenCvImagePreprocessor(ILogger<OpenCvImagePreprocessor> logger) : IImagePreprocessor
{
    public string Preprocess(string imagePath)
    {
        try
        {
            using var source = Cv2.ImRead(imagePath, ImreadModes.Grayscale);
            if (source.Empty())
            {
                logger.LogWarning("OpenCV could not read {Path}; using the original image.", imagePath);
                return imagePath;
            }

            using var denoised = new Mat();
            Cv2.FastNlMeansDenoising(source, denoised, h: 10);

            using var thresholded = new Mat();
            Cv2.AdaptiveThreshold(
                denoised, thresholded,
                maxValue: 255,
                adaptiveMethod: AdaptiveThresholdTypes.GaussianC,
                thresholdType: ThresholdTypes.Binary,
                blockSize: 31,
                c: 10);

            using var deskewed = Deskew(thresholded);

            var outputPath = Path.Combine(
                Path.GetDirectoryName(imagePath) ?? ".",
                $"{Path.GetFileNameWithoutExtension(imagePath)}.pre.png");

            Cv2.ImWrite(outputPath, deskewed);
            return outputPath;
        }
        catch (Exception ex)
        {
            // Typically a missing libopencv native dependency — degrade rather than fail the upload.
            logger.LogWarning(ex, "Image preprocessing unavailable; falling back to the original image.");
            return imagePath;
        }
    }

    /// <summary>Estimates page skew from the minimum-area rectangle of the dark pixels and rotates it out.</summary>
    private static Mat Deskew(Mat binary)
    {
        using var inverted = new Mat();
        Cv2.BitwiseNot(binary, inverted);

        using var points = new Mat();
        Cv2.FindNonZero(inverted, points);

        if (points.Empty() || points.Rows == 0)
            return binary.Clone();

        {
            var rect = Cv2.MinAreaRect(points);
            var angle = rect.Angle;
            if (angle < -45) angle += 90;

            // Sub-degree skew isn't worth an interpolation pass.
            if (Math.Abs(angle) < 0.5) return binary.Clone();

            var center = new Point2f(binary.Width / 2f, binary.Height / 2f);
            using var rotation = Cv2.GetRotationMatrix2D(center, angle, 1.0);

            var rotated = new Mat();
            Cv2.WarpAffine(
                binary, rotated, rotation, binary.Size(),
                InterpolationFlags.Cubic, BorderTypes.Replicate);

            return rotated;
        }
    }
}
