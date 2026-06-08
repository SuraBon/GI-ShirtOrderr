const getMock = vi.hoisted(() => vi.fn());

vi.mock("@vercel/blob", () => ({
  get: getMock
}));

function blobJsonResult(value, etag = "etag-1") {
  return {
    statusCode: 200,
    stream: new Response(JSON.stringify(value)).body,
    blob: { etag }
  };
}

describe("Blob JSON helper", () => {
  beforeEach(() => {
    vi.resetModules();
    getMock.mockReset();
  });

  it("returns cached JSON without re-reading Blob during the cache window", async () => {
    getMock.mockResolvedValueOnce(blobJsonResult({ branches: ["GI"] }));
    const { readJsonBlob } = await import("../api/blob/_json.js");

    await expect(readJsonBlob("shirt-config/branches.json")).resolves.toEqual({ branches: ["GI"] });
    await expect(readJsonBlob("shirt-config/branches.json")).resolves.toEqual({ branches: ["GI"] });

    expect(getMock).toHaveBeenCalledTimes(1);
  });

  it("uses cached JSON when Blob returns 304 after revalidation", async () => {
    getMock
      .mockResolvedValueOnce(blobJsonResult({ branches: ["GI"] }, "etag-1"))
      .mockResolvedValueOnce({ statusCode: 304, stream: null, blob: { etag: "etag-1" } });
    const { readJsonBlob } = await import("../api/blob/_json.js");

    await expect(readJsonBlob("shirt-config/branches.json", { ttlMs: -1 })).resolves.toEqual({ branches: ["GI"] });
    await expect(readJsonBlob("shirt-config/branches.json", { ttlMs: -1 })).resolves.toEqual({ branches: ["GI"] });

    expect(getMock).toHaveBeenLastCalledWith("shirt-config/branches.json", {
      access: "public",
      ifNoneMatch: "etag-1"
    });
  });

  it("serves stale cached JSON on normal reads when Blob temporarily fails", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    getMock
      .mockResolvedValueOnce(blobJsonResult({ config: [{ type: "A" }] }, "etag-1"))
      .mockRejectedValueOnce(new Error("BLOB_DOWN"));
    const { readJsonBlob } = await import("../api/blob/_json.js");

    await expect(readJsonBlob("shirt-config/clothing-config.json", { ttlMs: -1 })).resolves.toEqual({ config: [{ type: "A" }] });
    await expect(readJsonBlob("shirt-config/clothing-config.json", { ttlMs: -1 })).resolves.toEqual({ config: [{ type: "A" }] });

    expect(warnSpy).toHaveBeenCalledWith(
      "Serving cached Blob JSON after read failure",
      expect.objectContaining({ pathname: "shirt-config/clothing-config.json" })
    );
    warnSpy.mockRestore();
  });

  it("does not serve stale cached JSON when bypassing cache for write checks", async () => {
    getMock
      .mockResolvedValueOnce(blobJsonResult({ config: [{ type: "A" }] }, "etag-1"))
      .mockRejectedValueOnce(new Error("BLOB_DOWN"));
    const { readJsonBlob } = await import("../api/blob/_json.js");

    await expect(readJsonBlob("shirt-config/clothing-config.json", { ttlMs: -1 })).resolves.toEqual({ config: [{ type: "A" }] });
    await expect(readJsonBlob("shirt-config/clothing-config.json", { bypassCache: true })).rejects.toThrow("BLOB_DOWN");
  });
});
