import { describe, it, expect } from "vitest";
import { isCompressableImage, compressImageIfSafe } from "./image-compressor";

describe("image-compressor utility", () => {
  it("detects compressable image formats correctly", () => {
    const jpegFile = new File(["dummy"], "receipt.jpg", { type: "image/jpeg" });
    const pngFile = new File(["dummy"], "bill.png", { type: "image/png" });
    const pdfFile = new File(["dummy"], "statement.pdf", {
      type: "application/pdf",
    });
    const txtFile = new File(["dummy"], "notes.txt", { type: "text/plain" });

    expect(isCompressableImage(jpegFile)).toBe(true);
    expect(isCompressableImage(pngFile)).toBe(true);
    expect(isCompressableImage(pdfFile)).toBe(false);
    expect(isCompressableImage(txtFile)).toBe(false);
  });

  it("skips compression for images under the size threshold", async () => {
    const smallFile = new File(["small image content"], "small_bill.jpg", {
      type: "image/jpeg",
    });

    const result = await compressImageIfSafe(smallFile, {
      thresholdBytes: 1024 * 1024, // 1MB threshold
    });

    expect(result.wasCompressed).toBe(false);
    expect(result.file).toBe(smallFile);
    expect(result.originalSize).toBe(smallFile.size);
    expect(result.savingsRatio).toBe(0);
  });

  it("safely handles non-image files like PDFs without compression", async () => {
    const pdfBlob = new Uint8Array(2 * 1024 * 1024); // 2MB PDF
    const pdfFile = new File([pdfBlob], "hospital_bill.pdf", {
      type: "application/pdf",
    });

    const result = await compressImageIfSafe(pdfFile);

    expect(result.wasCompressed).toBe(false);
    expect(result.file).toBe(pdfFile);
  });
});
