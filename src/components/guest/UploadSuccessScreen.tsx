"use client";

interface Props {
  successCount: number;
  failedCount: number;
  onUploadAnother: () => void;
}

export function UploadSuccessScreen({ successCount, failedCount, onUploadAnother }: Props) {
  const allFailed = successCount === 0 && failedCount > 0;

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center animate-fade-in">
      {allFailed ? (
        <>
          <div className="text-6xl mb-6">⚠️</div>
          <h1 className="text-2xl font-semibold mb-2">Upload interrupted</h1>
          <p className="text-white/60 max-w-sm mb-10">
            We couldn&apos;t upload your photos. Please check your connection and try again.
          </p>
        </>
      ) : (
        <>
          <div className="text-6xl mb-6 animate-slide-up">✓</div>
          <h1 className="text-2xl font-semibold mb-2">
            Photo{successCount !== 1 ? "s" : ""} Uploaded
          </h1>
          <p className="text-white/60 max-w-sm mb-2">
            {successCount} photo{successCount !== 1 ? "s" : ""} added to the event gallery.
          </p>
          {failedCount > 0 && (
            <p className="text-amber-300/80 text-sm max-w-sm mb-8">
              {failedCount} photo{failedCount !== 1 ? "s" : ""} couldn&apos;t be uploaded.
            </p>
          )}
        </>
      )}

      <button
        onClick={onUploadAnother}
        className="tap-target bg-accent text-ink-950 font-semibold text-lg rounded-2xl px-10 py-4 active:scale-[0.98] transition-transform mt-4"
      >
        {allFailed ? "Try Again" : "Take Another Photo"}
      </button>
    </main>
  );
}
